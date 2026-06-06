import Fastify from "fastify";
import { applicationStatuses, type Listing, reviewStatuses, type SourceId } from "@homehunter/core";

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

function detectSourceId(sourceUrl: string): SourceId {
  const hostname = new URL(sourceUrl).hostname.toLowerCase();

  if (hostname.endsWith("kleinanzeigen.de")) {
    return "kleinanzeigen";
  }

  if (hostname.endsWith("immobilie1.de")) {
    return "immobilie1";
  }

  if (hostname.endsWith("immowelt.de")) {
    return "immowelt";
  }

  if (hostname.endsWith("immobilienscout24.de")) {
    return "immoscout24";
  }

  return "manual";
}
