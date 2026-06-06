import type { SourceId } from "@homehunter/core";

export type SourceCapability = "playwright" | "scraperapi" | "manual";

export type SourceDefinition = {
  id: SourceId;
  label: string;
  capability: SourceCapability;
  status: "ready" | "blocked" | "later";
  notes: string;
};

export const supportedSources: SourceDefinition[] = [
  {
    id: "kleinanzeigen",
    label: "Kleinanzeigen",
    capability: "playwright",
    status: "ready",
    notes: "Smoke test returned real listing content."
  },
  {
    id: "immobilie1",
    label: "immobilie1",
    capability: "playwright",
    status: "ready",
    notes: "Correct domain is immobilie1.de. Listing pages work with Playwright."
  },
  {
    id: "immowelt",
    label: "immowelt",
    capability: "scraperapi",
    status: "blocked",
    notes: "Direct Playwright receives CAPTCHA. ScraperAPI failed without ultra_premium."
  },
  {
    id: "immoscout24",
    label: "ImmoScout24",
    capability: "scraperapi",
    status: "later",
    notes: "Homepage works via ScraperAPI. Search pages need more testing."
  },
  {
    id: "manual",
    label: "Manual URL",
    capability: "manual",
    status: "ready",
    notes: "Manual URL ingestion is the first product entrypoint."
  }
];
