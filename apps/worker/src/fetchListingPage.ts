import { assertPlaywrightReadySource } from "@homehunter/sources";
import { chromium, type Browser, type Page } from "playwright";

export type FetchListingPageOptions = {
  browser?: Browser;
  preparePage?: (page: Page) => Promise<void>;
};

export type FetchedListingPage = {
  sourceId: ReturnType<typeof assertPlaywrightReadySource>;
  sourceUrl: string;
  finalUrl: string;
  statusCode: number | null;
  title: string;
  html: string;
  text: string;
  fetchedAt: string;
};

export async function fetchListingPage(
  sourceUrl: string,
  options: FetchListingPageOptions = {}
): Promise<FetchedListingPage> {
  const sourceId = assertPlaywrightReadySource(sourceUrl);
  const browser = options.browser ?? (await chromium.launch({ headless: true }));
  const shouldCloseBrowser = !options.browser;

  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 }
    });

    if (options.preparePage) {
      await options.preparePage(page);
    }

    const response = await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    await page.waitForTimeout(1000);

    return {
      sourceId,
      sourceUrl,
      finalUrl: page.url(),
      statusCode: response?.status() ?? null,
      title: await page.title(),
      html: await page.content(),
      text: await page.locator("body").innerText().catch(() => ""),
      fetchedAt: new Date().toISOString()
    };
  } finally {
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
}
