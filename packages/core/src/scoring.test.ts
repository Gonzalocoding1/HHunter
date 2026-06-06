import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreListing } from "./index.ts";

test("scoreListing gives high scores with explainable reasons for matching listings", () => {
  const result = scoreListing({
    title: "Helle Wohnung mit Balkon",
    location: "50667 Koeln Innenstadt",
    priceEur: 1250,
    rooms: 2,
    livingAreaSqm: 61,
    equipment: ["Balkon", "Keller"]
  });

  assert.equal(result.score, 100);
  assert.equal(result.scoreLabel, "Top Match");
  assert.deepEqual(result.reasons, [
    "Preis liegt im Budget",
    "Wohnflaeche passt",
    "Zimmeranzahl passt",
    "Lage passt zu Koeln",
    "Ausstattung passt: Balkon"
  ]);
});

test("scoreListing keeps weak listings low and records penalties", () => {
  const result = scoreListing({
    title: "Teure Wohnung",
    location: "Dortmund",
    priceEur: 2100,
    rooms: 1,
    livingAreaSqm: 32,
    equipment: []
  });

  assert.equal(result.score, 10);
  assert.equal(result.scoreLabel, "Niedrige Prioritaet");
  assert.deepEqual(result.reasons, ["Preis ueber Budget", "Wohnflaeche zu klein", "Lage ausserhalb Koeln"]);
});
