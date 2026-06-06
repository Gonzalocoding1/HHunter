import Fastify from "fastify";
import { applicationStatuses, type Listing, reviewStatuses } from "@homehunter/core";
import { createListingsRepository, type CreateListingInput } from "@homehunter/db";
import { detectSourceId } from "@homehunter/sources";
import pg from "pg";

type CreateListingPayload = {
  sourceUrl?: unknown;
};

export type ListingsRepository = {
  createListing: (input: CreateListingInput) => Promise<Listing>;
  listListings: () => Promise<Listing[]>;
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

  return server;
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
