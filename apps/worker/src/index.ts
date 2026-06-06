import "dotenv/config";
import { supportedSources } from "@homehunter/sources";
import { fetchListingPage } from "./fetchListingPage.ts";

console.log("HomeHunter worker ready");
console.log("Supported sources:", supportedSources.map((source) => source.id).join(", "));

const sourceUrl = process.argv[2];

if (sourceUrl) {
  const page = await fetchListingPage(sourceUrl);

  console.log(
    JSON.stringify(
      {
        sourceId: page.sourceId,
        statusCode: page.statusCode,
        title: page.title,
        finalUrl: page.finalUrl,
        textLength: page.text.length,
        htmlLength: page.html.length,
        fetchedAt: page.fetchedAt
      },
      null,
      2
    )
  );
}
