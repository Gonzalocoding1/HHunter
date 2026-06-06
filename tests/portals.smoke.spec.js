const { test, expect } = require("@playwright/test");

test.describe("German portal smoke checks", () => {
  test("immobilie1 rental search loads listing-like content", async ({ page }) => {
    await page.goto("https://anbieter.immobilie1.de/immobilien/nordrhein-westfalen/wohnung/mieten", {
      waitUntil: "domcontentloaded"
    });

    await expect(page).toHaveURL(/immobilie1\.de/);
    await expect(page.locator("body")).toContainText(/wohnungen zur miete|wohnfläche|zimmer/i, {
      timeout: 15000
    });
  });

  test("kleinanzeigen real-estate search loads listing-like content", async ({ page }) => {
    await page.goto("https://www.kleinanzeigen.de/s-wohnung-mieten/c203", {
      waitUntil: "domcontentloaded"
    });

    await expect(page).toHaveURL(/kleinanzeigen\.de/);
    await expect(
      page.locator("text=/wohnung|miete|immobilien/i").first()
    ).toBeVisible({ timeout: 15000 });
  });
});
