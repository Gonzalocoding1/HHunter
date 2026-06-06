import "dotenv/config";
import { supportedSources } from "@homehunter/sources";
import { extractListing } from "./extractListing.ts";
import { fetchListingPage } from "./fetchListingPage.ts";

console.log("HomeHunter worker ready");
console.log("Supported sources:", supportedSources.map((source) => source.id).join(", "));

const sourceUrl = process.argv[2];

if (sourceUrl) {
  const page = await fetchListingPage(sourceUrl);
  const extractedListing = extractListing(page);

  console.log(
    JSON.stringify(
      {
        statusCode: page.statusCode,
        finalUrl: page.finalUrl,
        textLength: page.text.length,
        htmlLength: page.html.length,
        fetchedAt: page.fetchedAt,
        listing: extractedListing
      },
      null,
      2
    )
  );
}
