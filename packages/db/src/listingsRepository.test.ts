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
