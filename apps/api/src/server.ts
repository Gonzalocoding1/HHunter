import Fastify from "fastify";
import {
  applicationStatuses,
  type Listing,
  reviewDecisions,
  type ReviewDecision,
  reviewStatuses
} from "@homehunter/core";
import { createListingsRepository, type CreateListingInput } from "@homehunter/db";
import { detectSourceId } from "@homehunter/sources";
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
};

export type BuildApiOptions = {
  listingsRepository?: ListingsRepository;
};

export function buildApi(options: BuildApiOptions = {}) {
  const server = Fastify({ logger: true });
  const listingsRepository = options.listingsRepository ?? createDefaultListingsRepository();

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
