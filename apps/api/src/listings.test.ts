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
  assert.equal(response.json().applicationStatus, "ready_to_send");
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

test("POST /listings/:id/generate-letter prepares a German application draft", async () => {
  const listingsRepository = createMemoryListingsRepository();
  const app = buildApi({
    listingsRepository,
    letterGenerator: async (listing) =>
      `Sehr geehrte Damen und Herren,\n\nich interessiere mich fuer ${listing.title}.\n\nMit freundlichen Gruessen`
  } as never);
  const created = await listingsRepository.createListing({
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Helle 2-Zimmer-Wohnung"
  });

  const response = await app.inject({
    method: "POST",
    url: `/listings/${created.id}/generate-letter`
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().applicationStatus, "prepared");
  assert.match(response.json().applicationDraft, /Sehr geehrte Damen und Herren/);
  assert.ok(response.json().applicationDraftGeneratedAt);
});

test("POST /listings/:id/extract fetches, extracts and stores listing details", async () => {
  const listingsRepository = createMemoryListingsRepository();
  const app = buildApi({
    listingsRepository,
    listingExtractor: async (listing) => ({
      title: "Helle 2-Zimmer-Wohnung",
      location: "50667 Koeln",
      priceEur: 1250,
      rooms: 2,
      livingAreaSqm: 61,
      floor: "3",
      equipment: ["Balkon", "Keller"],
      contact: {
        name: "Maria Becker",
        company: "Muster Immobilien GmbH",
        phone: "+49 221 1234567",
        email: "maria.becker@example.com",
        contactFormUrl: "https://www.kleinanzeigen.de/s-kontakt/demo/123"
      },
      rawData: {
        sourceUrl: listing.sourceUrl,
        fetchedAt: "2026-06-06T12:15:00.000Z",
        statusCode: 200,
        finalUrl: listing.sourceUrl
      }
    })
  } as never);
  const created = await listingsRepository.createListing({
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Manual listing from kleinanzeigen"
  });

  const response = await app.inject({
    method: "POST",
    url: `/listings/${created.id}/extract`
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().title, "Helle 2-Zimmer-Wohnung");
  assert.equal(response.json().location, "50667 Koeln");
  assert.equal(response.json().priceEur, 1250);
  assert.equal(response.json().rooms, 2);
  assert.equal(response.json().livingAreaSqm, 61);
  assert.equal(response.json().floor, "3");
  assert.deepEqual(response.json().equipment, ["Balkon", "Keller"]);
  assert.equal(response.json().score, 100);
  assert.equal(response.json().scoreLabel, "Top Match");
  assert.deepEqual(response.json().rawData.scoring, {
    score: 100,
    scoreLabel: "Top Match",
    reasons: [
      "Preis liegt im Budget",
      "Wohnflaeche passt",
      "Zimmeranzahl passt",
      "Lage passt zu Koeln",
      "Ausstattung passt: Balkon"
    ]
  });
  assert.equal(response.json().contactMethod, "email");
  assert.equal(response.json().contactEmail, "maria.becker@example.com");
  assert.equal(response.json().applicationUrl, "https://www.kleinanzeigen.de/s-kontakt/demo/123");
  assert.deepEqual(response.json().contact, {
    name: "Maria Becker",
    company: "Muster Immobilien GmbH",
    phone: "+49 221 1234567",
    email: "maria.becker@example.com",
    contactFormUrl: "https://www.kleinanzeigen.de/s-kontakt/demo/123"
  });
  assert.equal(response.json().applicationStatus, "new");
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
        applicationStatus: mapDecisionToApplicationStatus(decision),
        updatedAt: new Date("2026-06-06T12:05:00.000Z").toISOString()
      };

      listings[index] = updated;

      return updated;
    },

    async saveApplicationDraft(id, draft) {
      const index = listings.findIndex((listing) => listing.id === id);
      if (index === -1) {
        return null;
      }

      const updated: Listing & { applicationDraft: string; applicationDraftGeneratedAt: string } = {
        ...listings[index],
        applicationDraft: draft,
        applicationDraftGeneratedAt: new Date("2026-06-06T12:10:00.000Z").toISOString(),
        applicationStatus: "prepared",
        updatedAt: new Date("2026-06-06T12:10:00.000Z").toISOString()
      };

      listings[index] = updated;

      return updated;
    },

    async updateListingExtraction(id, extraction) {
      const index = listings.findIndex((listing) => listing.id === id);
      if (index === -1) {
        return null;
      }

      const updated: Listing = {
        ...listings[index],
        ...extraction,
        score: extraction.score ?? listings[index].score,
        scoreLabel: extraction.scoreLabel ?? listings[index].scoreLabel,
        contactMethod: inferContactMethod(extraction.contact),
        contactEmail: extraction.contact?.email,
        applicationUrl: extraction.contact?.contactFormUrl,
        rawData: {
          ...listings[index].rawData,
          extraction: extraction.rawData,
          ...(extraction.scoring ? { scoring: extraction.scoring } : {})
        },
        updatedAt: new Date("2026-06-06T12:15:00.000Z").toISOString()
      };

      listings[index] = updated;

      return updated;
    }
  };
}

function mapDecisionToApplicationStatus(decision: "approved" | "rejected" | "reviewed"): Listing["applicationStatus"] {
  if (decision === "approved") {
    return "ready_to_send";
  }

  if (decision === "rejected") {
    return "rejected";
  }

  return "reviewed";
}

function inferContactMethod(contact: Listing["contact"]): Listing["contactMethod"] {
  if (contact?.email) {
    return "email";
  }

  if (contact?.contactFormUrl) {
    return "form";
  }

  return "external";
}
