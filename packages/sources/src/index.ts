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

export function detectSourceId(sourceUrl: string): SourceId {
  const hostname = new URL(sourceUrl).hostname.toLowerCase();

  if (isHostOrSubdomain(hostname, "kleinanzeigen.de")) {
    return "kleinanzeigen";
  }

  if (isHostOrSubdomain(hostname, "immobilie1.de")) {
    return "immobilie1";
  }

  if (isHostOrSubdomain(hostname, "immowelt.de")) {
    return "immowelt";
  }

  if (isHostOrSubdomain(hostname, "immobilienscout24.de") || isHostOrSubdomain(hostname, "immoscout24.de")) {
    return "immoscout24";
  }

  return "manual";
}

function isHostOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getSourceDefinition(sourceId: SourceId): SourceDefinition {
  const source = supportedSources.find((definition) => definition.id === sourceId);

  if (!source) {
    throw new Error(`Unknown source ${sourceId}`);
  }

  return source;
}

export function assertPlaywrightReadySource(sourceUrl: string): SourceId {
  const sourceId = detectSourceId(sourceUrl);
  const source = getSourceDefinition(sourceId);

  if (source.capability !== "playwright" || source.status !== "ready") {
    throw new Error(`Source ${sourceId} is not ready for Playwright fetching`);
  }

  return sourceId;
}
