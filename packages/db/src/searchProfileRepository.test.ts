import assert from "node:assert/strict";
import { test } from "node:test";
import type { SearchProfile } from "@homehunter/core";
import { createSearchProfileRepository, type Queryable } from "./searchProfileRepository.ts";

test("getSearchProfile returns stored search profile", async () => {
  const db: Queryable = {
    async query() {
      return {
        rows: [
          {
            id: "default",
            city: "Berlin",
            max_price_eur: 1700,
            min_living_area_sqm: 70,
            min_rooms: 3,
            preferred_equipment: ["Einbauküche"],
            created_at: new Date("2026-06-06T12:00:00.000Z"),
            updated_at: new Date("2026-06-06T12:05:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createSearchProfileRepository(db);

  assert.deepEqual(await repository.getSearchProfile(), {
    city: "Berlin",
    maxPriceEur: 1700,
    minLivingAreaSqm: 70,
    minRooms: 3,
    preferredEquipment: ["Einbauküche"]
  });
});

test("saveSearchProfile upserts the single-user profile", async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const profile: SearchProfile = {
    city: "Berlin",
    maxPriceEur: 1700,
    minLivingAreaSqm: 70,
    minRooms: 3,
    preferredEquipment: ["Einbauküche"]
  };
  const db: Queryable = {
    async query(text, values = []) {
      queries.push({ text, values });

      return {
        rows: [
          {
            id: "default",
            city: "Berlin",
            max_price_eur: 1700,
            min_living_area_sqm: 70,
            min_rooms: 3,
            preferred_equipment: ["Einbauküche"],
            created_at: new Date("2026-06-06T12:00:00.000Z"),
            updated_at: new Date("2026-06-06T12:05:00.000Z")
          }
        ]
      };
    }
  };

  const repository = createSearchProfileRepository(db);
  const saved = await repository.saveSearchProfile(profile);

  assert.match(queries[0].text, /on conflict \(id\) do update/i);
  assert.deepEqual(queries[0].values, ["default", "Berlin", 1700, 70, 3, ["Einbauküche"]]);
  assert.deepEqual(saved, profile);
});
