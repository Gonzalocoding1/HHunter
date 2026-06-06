import Fastify from "fastify";
import { applicationStatuses, type Listing, reviewStatuses } from "@homehunter/core";
import { detectSourceId } from "@homehunter/sources";

type CreateListingPayload = {
  sourceUrl?: unknown;
};

export function buildApi() {
  const server = Fastify({ logger: true });
  const listings: Listing[] = [];

  server.get("/health", async () => ({
    ok: true,
    service: "homehunter-api",
    reviewStatuses,
    applicationStatuses
  }));

  server.get("/listings", async () => listings);

  server.post<{ Body: CreateListingPayload }>("/listings", async (request, reply) => {
    const sourceUrl = parseSourceUrl(request.body?.sourceUrl);

    if (!sourceUrl) {
      return reply.code(400).send({
        error: "sourceUrl must be a valid http or https URL"
      });
    }

    const now = new Date().toISOString();
    const sourceId = detectSourceId(sourceUrl);
    const listing: Listing = {
      id: crypto.randomUUID(),
      sourceId,
      sourceUrl,
      title: `Manual listing from ${sourceId}`,
      reviewStatus: "new",
      applicationStatus: "new",
      createdAt: now,
      updatedAt: now
    };

    listings.push(listing);

    return reply.code(201).send(listing);
  });

  return server;
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
