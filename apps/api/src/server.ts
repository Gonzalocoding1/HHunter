import Fastify from "fastify";
import {
  applicationStatuses,
  type Listing,
  reviewDecisions,
  type ReviewDecision,
  reviewStatuses
} from "@homehunter/core";
import { createListingsRepository, type CreateListingInput, type UpdateListingExtractionInput } from "@homehunter/db";
import { detectSourceId } from "@homehunter/sources";
import { extractListing } from "@homehunter/worker/extractListing";
import { fetchListingPage } from "@homehunter/worker/fetchListingPage";
import pg from "pg";

type CreateListingPayload = {
  sourceUrl?: unknown;
};

type ListingParams = {
  id: string;
};

type ReviewListingPayload = {
  decision?: unknown;
};

export type ListingsRepository = {
  createListing: (input: CreateListingInput) => Promise<Listing>;
  listListings: () => Promise<Listing[]>;
  getListingById: (id: string) => Promise<Listing | null>;
  updateReviewDecision: (id: string, decision: ReviewDecision) => Promise<Listing | null>;
  saveApplicationDraft: (id: string, draft: string) => Promise<Listing | null>;
  updateListingExtraction: (id: string, extraction: UpdateListingExtractionInput) => Promise<Listing | null>;
};

export type LetterGenerator = (listing: Listing) => Promise<string>;
export type ListingExtractor = (listing: Listing) => Promise<UpdateListingExtractionInput>;

export type BuildApiOptions = {
  listingsRepository?: ListingsRepository;
  letterGenerator?: LetterGenerator;
  listingExtractor?: ListingExtractor;
};

export function buildApi(options: BuildApiOptions = {}) {
  const server = Fastify({ logger: true });
  const listingsRepository = options.listingsRepository ?? createDefaultListingsRepository();
  const letterGenerator = options.letterGenerator ?? createOpenAiLetterGenerator();
  const listingExtractor = options.listingExtractor ?? createPlaywrightListingExtractor();

  server.get("/health", async () => ({
    ok: true,
    service: "homehunter-api",
    reviewStatuses,
    applicationStatuses
  }));

  server.get("/listings", async () => listingsRepository.listListings());

  server.get<{ Params: ListingParams }>("/listings/:id", async (request, reply) => {
    const listing = await listingsRepository.getListingById(request.params.id);

    if (!listing) {
      return reply.code(404).send({ error: "listing not found" });
    }

    return listing;
  });

  server.post<{ Body: CreateListingPayload }>("/listings", async (request, reply) => {
    const sourceUrl = parseSourceUrl(request.body?.sourceUrl);

    if (!sourceUrl) {
      return reply.code(400).send({
        error: "sourceUrl must be a valid http or https URL"
      });
    }

    const sourceId = detectSourceId(sourceUrl);
    const listing = await listingsRepository.createListing({
      sourceId,
      sourceUrl,
      title: `Manual listing from ${sourceId}`
    });

    return reply.code(201).send(listing);
  });

  server.post<{ Params: ListingParams; Body: ReviewListingPayload }>(
    "/listings/:id/review",
    async (request, reply) => {
      const decision = parseReviewDecision(request.body?.decision);

      if (!decision) {
        return reply.code(400).send({
          error: "decision must be one of approved, rejected, reviewed"
        });
      }

      const listing = await listingsRepository.updateReviewDecision(request.params.id, decision);

      if (!listing) {
        return reply.code(404).send({ error: "listing not found" });
      }

      return listing;
    }
  );

  server.post<{ Params: ListingParams }>("/listings/:id/generate-letter", async (request, reply) => {
    const listing = await listingsRepository.getListingById(request.params.id);

    if (!listing) {
      return reply.code(404).send({ error: "listing not found" });
    }

    const draft = await letterGenerator(listing);
    const updated = await listingsRepository.saveApplicationDraft(request.params.id, draft);

    if (!updated) {
      return reply.code(404).send({ error: "listing not found" });
    }

    return updated;
  });

  server.post<{ Params: ListingParams }>("/listings/:id/extract", async (request, reply) => {
    const listing = await listingsRepository.getListingById(request.params.id);

    if (!listing) {
      return reply.code(404).send({ error: "listing not found" });
    }

    const extraction = await listingExtractor(listing);
    const updated = await listingsRepository.updateListingExtraction(request.params.id, extraction);

    if (!updated) {
      return reply.code(404).send({ error: "listing not found" });
    }

    return updated;
  });

  return server;
}

function parseReviewDecision(value: unknown): ReviewDecision | null {
  if (typeof value !== "string") {
    return null;
  }

  return reviewDecisions.includes(value as ReviewDecision) ? (value as ReviewDecision) : null;
}

function createDefaultListingsRepository(): ListingsRepository {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required when no listingsRepository is provided");
  }

  const pool = new pg.Pool({ connectionString });
  return createListingsRepository(pool);
}

function createOpenAiLetterGenerator(): LetterGenerator {
  return async (listing) => {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required to generate application letters");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Du schreibst praezise, freundliche deutsche Wohnungsbewerbungen. Keine erfundenen Fakten. Keine Versandbestaetigung."
          },
          {
            role: "user",
            content: buildLetterPrompt(listing)
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI letter generation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as { output_text?: unknown };
    if (typeof payload.output_text !== "string" || payload.output_text.trim().length === 0) {
      throw new Error("OpenAI letter generation returned no text");
    }

    return payload.output_text.trim();
  };
}

function createPlaywrightListingExtractor(): ListingExtractor {
  return async (listing) => {
    const page = await fetchListingPage(listing.sourceUrl);
    const extracted = extractListing(page);

    return {
      title: extracted.title,
      location: extracted.location,
      priceEur: extracted.priceEur,
      rooms: extracted.rooms,
      livingAreaSqm: extracted.livingAreaSqm,
      floor: extracted.floor,
      equipment: extracted.equipment,
      contact: extracted.contact,
      rawData: {
        fetchedAt: page.fetchedAt,
        finalUrl: page.finalUrl,
        statusCode: page.statusCode,
        textLength: page.text.length,
        htmlLength: page.html.length,
        rawText: extracted.rawText
      }
    };
  };
}

function buildLetterPrompt(listing: Listing): string {
  return [
    "Erstelle ein kurzes Anschreiben fuer diese Wohnung.",
    "Der Text soll mit einer passenden deutschen Anrede beginnen und mit einer neutralen Grussformel enden.",
    "Nutze nur die vorhandenen Inseratsdaten.",
    "",
    `Titel: ${listing.title}`,
    listing.location ? `Lage: ${listing.location}` : null,
    listing.priceEur ? `Preis: ${listing.priceEur} EUR` : null,
    listing.rooms ? `Zimmer: ${listing.rooms}` : null,
    listing.livingAreaSqm ? `Wohnflaeche: ${listing.livingAreaSqm} qm` : null,
    listing.floor ? `Etage: ${listing.floor}` : null,
    listing.equipment?.length ? `Ausstattung: ${listing.equipment.join(", ")}` : null,
    listing.contact?.name ? `Kontaktperson: ${listing.contact.name}` : null,
    listing.contact?.company ? `Firma: ${listing.contact.company}` : null,
    `Quelle: ${listing.sourceUrl}`
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function parseSourceUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
