import assert from "node:assert/strict";
import { test } from "node:test";
import { assertPlaywrightReadySource, detectSourceId } from "./index.ts";

test("detectSourceId requires exact portal hostnames or subdomains", () => {
  assert.equal(detectSourceId("https://www.kleinanzeigen.de/s-wohnung-mieten/c203"), "kleinanzeigen");
  assert.equal(detectSourceId("https://anbieter.immobilie1.de/immobilien/demo"), "immobilie1");
  assert.equal(detectSourceId("https://fakekleinanzeigen.de/s-wohnung-mieten/c203"), "manual");
  assert.equal(detectSourceId("https://notimmobilie1.de/immobilien/demo"), "manual");
});

test("detectSourceId recognizes common ImmoScout24 hostnames", () => {
  assert.equal(detectSourceId("https://www.immobilienscout24.de/"), "immoscout24");
  assert.equal(detectSourceId("https://www.immoscout24.de/"), "immoscout24");
});

test("assertPlaywrightReadySource rejects blocked and manual sources", () => {
  assert.throws(
    () => assertPlaywrightReadySource("https://fakekleinanzeigen.de/s-wohnung-mieten/c203"),
    /Source manual is not ready for Playwright fetching/
  );
  assert.throws(
    () => assertPlaywrightReadySource("https://www.immowelt.de/"),
    /Source immowelt is not ready for Playwright fetching/
  );
});
