import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";
import { fetchListingPage } from "./fetchListingPage.ts";

test("fetchListingPage fetches immobilie1 pages with Playwright", async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    const result = await fetchListingPage(
      "https://anbieter.immobilie1.de/immobilien/nordrhein-westfalen/wohnung/mieten",
      {
        browser,
        preparePage: async (page) => {
          await page.route("**/*", async (route) => {
            await route.fulfill({
              status: 200,
              contentType: "text/html",
              body: "<html><head><title>Wohnungen zur Miete</title></head><body>884 Wohnungen zur Miete in Nordrhein-Westfalen</body></html>"
            });
          });
        }
      }
    );

    assert.equal(result.sourceId, "immobilie1");
    assert.equal(result.statusCode, 200);
    assert.equal(result.title, "Wohnungen zur Miete");
    assert.match(result.text, /Wohnungen zur Miete/);
    assert.match(result.html, /884 Wohnungen/);
    assert.ok(result.fetchedAt);
  } finally {
    await browser.close();
  }
});

test("fetchListingPage rejects sources that are not Playwright-ready", async () => {
  await assert.rejects(
    () => fetchListingPage("https://www.immowelt.de/"),
    /Source immowelt is not ready for Playwright fetching/
  );
});
