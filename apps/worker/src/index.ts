import "dotenv/config";
import { supportedSources } from "@homehunter/sources";
import { extractListing } from "./extractListing.ts";
import { fetchListingPage } from "./fetchListingPage.ts";
import { createScheduler, parseSchedulerConfig, type ScheduledJob } from "./scheduler.ts";

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
} else {
  const schedulerConfig = parseSchedulerConfig(process.env);
  const scheduledJobs: ScheduledJob[] = [
    {
      name: "scheduled-listing-check-placeholder",
      run: async () => {
        console.log("Scheduled listing check placeholder ran. No applications are sent by the worker.");
      }
    }
  ];
  const scheduler = createScheduler(schedulerConfig, scheduledJobs);

  if (schedulerConfig.enabled) {
    console.log(`Worker scheduler enabled. Interval: ${schedulerConfig.intervalMs}ms`);
    scheduler.start();
  } else {
    console.log("Worker scheduler disabled. Set WORKER_SCHEDULER_ENABLED=true to enable scheduled checks.");
  }
}
