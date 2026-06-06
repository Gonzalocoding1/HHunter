import assert from "node:assert/strict";
import { test } from "node:test";
import type { Listing } from "@homehunter/core";
import { buildApi, type ListingsRepository } from "./server.ts";

test("POST /listings stores a manually submitted immobilie1 URL", async () => {
  const listingsRepository = createMemoryListingsRepository();
  const app = buildApi({ listingsRepository });

  const createResponse = await app.inject({
    method: "POST",
    url: "/listings",
    payload: {
      sourceUrl: "https://anbieter.immobilie1.de/immobilien/nordrhein-westfalen/wohnung/mieten"
    }
  });

  assert.equal(createResponse.statusCode, 201);

  const created = createResponse.json();
  assert.equal(created.sourceId, "immobilie1");
  assert.equal(created.sourceUrl, "https://anbieter.immobilie1.de/immobilien/nordrhein-westfalen/wohnung/mieten");
  assert.equal(created.title, "Manual listing from immobilie1");
  assert.equal(created.reviewStatus, "new");
  assert.equal(created.applicationStatus, "new");
  assert.ok(created.id);
  assert.ok(created.createdAt);
  assert.ok(created.updatedAt);

  const listResponse = await app.inject({
    method: "GET",
    url: "/listings"
  });

  assert.equal(listResponse.statusCode, 200);
  assert.deepEqual(listResponse.json(), [created]);
});

test("POST /listings rejects invalid URLs", async () => {
  const app = buildApi({ listingsRepository: createMemoryListingsRepository() });

  const response = await app.inject({
    method: "POST",
    url: "/listings",
    payload: {
      sourceUrl: "not a url"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "sourceUrl must be a valid http or https URL"
  });
});

test("GET /listings/:id returns a single listing", async () => {
  const listingsRepository = createMemoryListingsRepository();
  const app = buildApi({ listingsRepository });
  const created = await listingsRepository.createListing({
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Manual listing from kleinanzeigen"
  });

  const response = await app.inject({
    method: "GET",
    url: `/listings/${created.id}`
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), created);
});

test("POST /listings/:id/review stores an approval decision", async () => {
  const listingsRepository = createMemoryListingsRepository();
  const app = buildApi({ listingsRepository });
  const created = await listingsRepository.createListing({
    sourceId: "immobilie1",
    sourceUrl: "https://anbieter.immobilie1.de/expose/demo",
    title: "Manual listing from immobilie1"
  });

  const response = await app.inject({
    method: "POST",
    url: `/listings/${created.id}/review`,
    payload: {
      decision: "approved"
    }
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().reviewStatus, "approved");
  assert.equal(response.json().applicationStatus, "approved");
});

test("POST /listings/:id/review rejects unknown decisions", async () => {
  const listingsRepository = createMemoryListingsRepository();
  const app = buildApi({ listingsRepository });
  const created = await listingsRepository.createListing({
    sourceId: "immobilie1",
    sourceUrl: "https://anbieter.immobilie1.de/expose/demo",
    title: "Manual listing from immobilie1"
  });

  const response = await app.inject({
    method: "POST",
    url: `/listings/${created.id}/review`,
    payload: {
      decision: "send_now"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "decision must be one of approved, rejected, reviewed"
  });
});

function createMemoryListingsRepository(): ListingsRepository {
  const listings: Listing[] = [];

  return {
    async createListing(input) {
      const now = new Date("2026-06-06T12:00:00.000Z").toISOString();
      const listing: Listing = {
        id: `listing-${listings.length + 1}`,
        sourceId: input.sourceId,
        sourceUrl: input.sourceUrl,
        normalizedUrl: input.sourceUrl,
        title: input.title,
        score: 0,
        scoreLabel: "Nicht bewertet",
        status: "new",
        contactMethod: "form",
        rawData: input.rawData ?? { source: "manual" },
        reviewStatus: "new",
        applicationStatus: "new",
        createdAt: now,
        updatedAt: now
      };

      listings.push(listing);

      return listing;
    },

    async listListings() {
      return listings;
    },

    async getListingById(id) {
      return listings.find((listing) => listing.id === id) ?? null;
    },

    async updateReviewDecision(id, decision) {
      const index = listings.findIndex((listing) => listing.id === id);
      if (index === -1) {
        return null;
      }

      const updated: Listing = {
        ...listings[index],
        reviewStatus: decision,
        applicationStatus: decision === "approved" ? "approved" : listings[index].applicationStatus,
        updatedAt: new Date("2026-06-06T12:05:00.000Z").toISOString()
      };

      listings[index] = updated;

      return updated;
    }
  };
}
