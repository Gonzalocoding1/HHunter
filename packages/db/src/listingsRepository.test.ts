import assert from "node:assert/strict";
import { test } from "node:test";
import { createListingsRepository, type Queryable } from "./listingsRepository.ts";

test("createListing persists a listing row and maps it back", async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const db: Queryable = {
    async query(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            id: "listing-1",
            source_id: "immobilie1",
            source_url: "https://anbieter.immobilie1.de/expose/demo",
            normalized_url: "https://anbieter.immobilie1.de/expose/demo",
            title: "Manual listing from immobilie1",
            location: null,
            price_eur: null,
            rooms: null,
            living_area_sqm: null,
            floor: null,
            equipment: [],
            score: 0,
            score_label: "Nicht bewertet",
            duplicate_of_id: null,
            status: "new",
            contact_method: "form",
            contact_email: null,
            application_url: null,
            contact: null,
            raw_data: { source: "manual" },
            review_status: "new",
            application_status: "new",
            created_at: new Date("2026-06-06T10:00:00.000Z"),
            updated_at: new Date("2026-06-06T10:00:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createListingsRepository(db);
  const created = await repository.createListing({
    sourceId: "immobilie1",
    sourceUrl: "https://anbieter.immobilie1.de/expose/demo",
    title: "Manual listing from immobilie1"
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /insert into listings/i);
  assert.deepEqual(queries[0].values.slice(1, 4), [
    "immobilie1",
    "https://anbieter.immobilie1.de/expose/demo",
    "https://anbieter.immobilie1.de/expose/demo"
  ]);
  assert.equal(created.id, "listing-1");
  assert.equal(created.sourceId, "immobilie1");
  assert.equal(created.normalizedUrl, "https://anbieter.immobilie1.de/expose/demo");
  assert.equal(created.status, "new");
  assert.equal(created.contactMethod, "form");
  assert.deepEqual(created.rawData, { source: "manual" });
  assert.equal(created.reviewStatus, "new");
  assert.equal(created.applicationStatus, "new");
  assert.equal(created.createdAt, "2026-06-06T10:00:00.000Z");
});

test("listListings maps database rows to Listing objects", async () => {
  const db: Queryable = {
    async query() {
      return {
        rows: [
          {
            id: "listing-1",
            source_id: "kleinanzeigen",
            source_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            normalized_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            title: "Schöne Wohnung",
            location: "Berlin",
            price_eur: 1200,
            rooms: 2,
            living_area_sqm: 64,
            floor: "2",
            equipment: ["Balkon"],
            score: 72,
            score_label: "Gute Priorität",
            duplicate_of_id: null,
            status: "new",
            contact_method: "email",
            contact_email: "anbieter@example.com",
            application_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            contact: { name: "Max Mustermann" },
            raw_data: { portal: "kleinanzeigen" },
            review_status: "new",
            application_status: "new",
            created_at: new Date("2026-06-06T11:00:00.000Z"),
            updated_at: new Date("2026-06-06T11:00:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createListingsRepository(db);
  const listings = await repository.listListings();

  assert.deepEqual(listings, [
    {
      id: "listing-1",
      sourceId: "kleinanzeigen",
      sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
      normalizedUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
      title: "Schöne Wohnung",
      location: "Berlin",
      priceEur: 1200,
      rooms: 2,
      livingAreaSqm: 64,
      floor: "2",
      equipment: ["Balkon"],
      score: 72,
      scoreLabel: "Gute Priorität",
      status: "new",
      contactMethod: "email",
      contactEmail: "anbieter@example.com",
      applicationUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
      contact: { name: "Max Mustermann" },
      rawData: { portal: "kleinanzeigen" },
      reviewStatus: "new",
      applicationStatus: "new",
      createdAt: "2026-06-06T11:00:00.000Z",
      updatedAt: "2026-06-06T11:00:00.000Z"
    }
  ]);
});

test("getListingById returns null when no row exists", async () => {
  const db: Queryable = {
    async query() {
      return { rows: [] };
    }
  };

  const repository = createListingsRepository(db);

  assert.equal(await repository.getListingById("missing"), null);
});

test("updateReviewDecision persists approved review status", async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const db: Queryable = {
    async query(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            id: "listing-1",
            source_id: "immobilie1",
            source_url: "https://anbieter.immobilie1.de/expose/demo",
            normalized_url: "https://anbieter.immobilie1.de/expose/demo",
            title: "Schöne Wohnung",
            location: null,
            price_eur: null,
            rooms: null,
            living_area_sqm: null,
            floor: null,
            equipment: [],
            score: 0,
            score_label: "Nicht bewertet",
            duplicate_of_id: null,
            status: "new",
            contact_method: "form",
            contact_email: null,
            application_url: null,
            contact: null,
            raw_data: null,
            review_status: "approved",
            application_status: "ready_to_send",
            created_at: new Date("2026-06-06T11:00:00.000Z"),
            updated_at: new Date("2026-06-06T11:05:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createListingsRepository(db);
  const updated = await repository.updateReviewDecision("listing-1", "approved");

  assert.match(queries[0].text, /update listings/i);
  assert.deepEqual(queries[0].values, ["listing-1", "approved", "ready_to_send"]);
  assert.equal(updated?.reviewStatus, "approved");
  assert.equal(updated?.applicationStatus, "ready_to_send");
});

test("updateReviewDecision maps rejected decisions to rejected application status", async () => {
  const queries: Array<{ values: unknown[] }> = [];
  const db: Queryable = {
    async query(_text, values = []) {
      queries.push({ values });

      return {
        rows: [
          {
            id: "listing-1",
            source_id: "immobilie1",
            source_url: "https://anbieter.immobilie1.de/expose/demo",
            normalized_url: "https://anbieter.immobilie1.de/expose/demo",
            title: "Schöne Wohnung",
            location: null,
            price_eur: null,
            rooms: null,
            living_area_sqm: null,
            floor: null,
            equipment: [],
            score: 0,
            score_label: "Nicht bewertet",
            duplicate_of_id: null,
            status: "new",
            contact_method: "form",
            contact_email: null,
            application_url: null,
            contact: null,
            raw_data: null,
            review_status: "rejected",
            application_status: "rejected",
            created_at: new Date("2026-06-06T11:00:00.000Z"),
            updated_at: new Date("2026-06-06T11:05:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createListingsRepository(db);
  const updated = await repository.updateReviewDecision("listing-1", "rejected");

  assert.deepEqual(queries[0].values, ["listing-1", "rejected", "rejected"]);
  assert.equal(updated?.reviewStatus, "rejected");
  assert.equal(updated?.applicationStatus, "rejected");
});

test("saveApplicationDraft stores a prepared draft and marks listing prepared", async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const db: Queryable = {
    async query(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            id: "listing-1",
            source_id: "kleinanzeigen",
            source_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            normalized_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            title: "Helle Wohnung",
            location: "Berlin",
            price_eur: 1100,
            rooms: 2,
            living_area_sqm: 58,
            floor: null,
            equipment: [],
            score: 0,
            score_label: "Nicht bewertet",
            duplicate_of_id: null,
            status: "new",
            contact_method: "form",
            contact_email: null,
            application_url: null,
            contact: null,
            raw_data: null,
            review_status: "new",
            application_status: "prepared",
            application_draft: "Sehr geehrte Damen und Herren",
            application_draft_generated_at: new Date("2026-06-06T12:10:00.000Z"),
            created_at: new Date("2026-06-06T11:00:00.000Z"),
            updated_at: new Date("2026-06-06T12:10:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createListingsRepository(db);
  const updated = await (repository as never as { saveApplicationDraft: (id: string, draft: string) => Promise<unknown> }).saveApplicationDraft(
    "listing-1",
    "Sehr geehrte Damen und Herren"
  );

  assert.match(queries[0].text, /update listings/i);
  assert.deepEqual(queries[0].values, ["listing-1", "Sehr geehrte Damen und Herren"]);
  assert.deepEqual(updated, {
    id: "listing-1",
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    normalizedUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Helle Wohnung",
    location: "Berlin",
    priceEur: 1100,
    rooms: 2,
    livingAreaSqm: 58,
    equipment: [],
    score: 0,
    scoreLabel: "Nicht bewertet",
    status: "new",
    contactMethod: "form",
    reviewStatus: "new",
    applicationStatus: "prepared",
    applicationDraft: "Sehr geehrte Damen und Herren",
    applicationDraftGeneratedAt: "2026-06-06T12:10:00.000Z",
    createdAt: "2026-06-06T11:00:00.000Z",
    updatedAt: "2026-06-06T12:10:00.000Z"
  });
});

test("updateListingExtraction stores extracted listing details without changing application status", async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const db: Queryable = {
    async query(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            id: "listing-1",
            source_id: "kleinanzeigen",
            source_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            normalized_url: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
            title: "Helle 2-Zimmer-Wohnung",
            location: "50667 Koeln",
            price_eur: 1250,
            rooms: 2,
            living_area_sqm: 61,
            floor: "3",
            equipment: ["Balkon", "Keller"],
            score: 0,
            score_label: "Nicht bewertet",
            duplicate_of_id: null,
            status: "new",
            contact_method: "email",
            contact_email: "maria.becker@example.com",
            application_url: "https://www.kleinanzeigen.de/s-kontakt/demo/123",
            contact: {
              name: "Maria Becker",
              company: "Muster Immobilien GmbH",
              phone: "+49 221 1234567",
              email: "maria.becker@example.com",
              contactFormUrl: "https://www.kleinanzeigen.de/s-kontakt/demo/123"
            },
            raw_data: { extraction: { statusCode: 200 } },
            application_draft: null,
            application_draft_generated_at: null,
            review_status: "new",
            application_status: "new",
            created_at: new Date("2026-06-06T11:00:00.000Z"),
            updated_at: new Date("2026-06-06T12:15:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createListingsRepository(db);
  const updated = await (
    repository as never as {
      updateListingExtraction: (
        id: string,
        extraction: {
          title: string;
          location?: string;
          priceEur?: number;
          rooms?: number;
          livingAreaSqm?: number;
          floor?: string;
          equipment: string[];
          contact?: {
            name?: string;
            company?: string;
            phone?: string;
            email?: string;
            contactFormUrl?: string;
          };
          rawData: Record<string, unknown>;
        }
      ) => Promise<unknown>;
    }
  ).updateListingExtraction("listing-1", {
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
    rawData: { statusCode: 200 }
  });

  assert.match(queries[0].text, /update listings/i);
  assert.deepEqual(queries[0].values, [
    "listing-1",
    "Helle 2-Zimmer-Wohnung",
    "50667 Koeln",
    1250,
    2,
    61,
    "3",
    ["Balkon", "Keller"],
    "email",
    "maria.becker@example.com",
    "https://www.kleinanzeigen.de/s-kontakt/demo/123",
    {
      name: "Maria Becker",
      company: "Muster Immobilien GmbH",
      phone: "+49 221 1234567",
      email: "maria.becker@example.com",
      contactFormUrl: "https://www.kleinanzeigen.de/s-kontakt/demo/123"
    },
    JSON.stringify({ statusCode: 200 })
  ]);
  assert.deepEqual(updated, {
    id: "listing-1",
    sourceId: "kleinanzeigen",
    sourceUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    normalizedUrl: "https://www.kleinanzeigen.de/s-anzeige/demo/123",
    title: "Helle 2-Zimmer-Wohnung",
    location: "50667 Koeln",
    priceEur: 1250,
    rooms: 2,
    livingAreaSqm: 61,
    floor: "3",
    equipment: ["Balkon", "Keller"],
    score: 0,
    scoreLabel: "Nicht bewertet",
    status: "new",
    contactMethod: "email",
    contactEmail: "maria.becker@example.com",
    applicationUrl: "https://www.kleinanzeigen.de/s-kontakt/demo/123",
    contact: {
      name: "Maria Becker",
      company: "Muster Immobilien GmbH",
      phone: "+49 221 1234567",
      email: "maria.becker@example.com",
      contactFormUrl: "https://www.kleinanzeigen.de/s-kontakt/demo/123"
    },
    rawData: { extraction: { statusCode: 200 } },
    reviewStatus: "new",
    applicationStatus: "new",
    createdAt: "2026-06-06T11:00:00.000Z",
    updatedAt: "2026-06-06T12:15:00.000Z"
  });
});
