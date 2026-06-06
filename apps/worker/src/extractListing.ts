import type { SourceId } from "@homehunter/core";

export type ExtractListingInput = {
  sourceId: SourceId;
  sourceUrl: string;
  title: string;
  text: string;
};

export type ExtractedListing = {
  sourceId: SourceId;
  sourceUrl: string;
  title: string;
  location?: string;
  priceEur?: number;
  livingAreaSqm?: number;
  rooms?: number;
  equipment: string[];
  rawText: string;
};

const equipmentTerms = [
  "Balkon",
  "Terrasse",
  "Keller",
  "Gäste-WC",
  "Einbauküche",
  "Garten",
  "Aufzug",
  "Garage",
  "Stellplatz"
];

export function extractListing(input: ExtractListingInput): ExtractedListing {
  const text = normalizeText(input.text);

  return {
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    title: input.title.trim() || "Untitled listing",
    location: extractLocation(text),
    priceEur: extractEuroPrice(text),
    livingAreaSqm: extractNumberBeforeLabel(text, /wohnfläche/i),
    rooms: extractNumberBeforeLabel(text, /zimmer/i),
    equipment: extractEquipment(text),
    rawText: input.text
  };
}

function normalizeText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function extractLocation(text: string): string | undefined {
  return text.match(/\b\d{5}\s+[A-ZÄÖÜ][\p{L}\-/ ]+/u)?.[0]?.trim();
}

function extractEquipment(text: string): string[] {
  const lowerText = text.toLowerCase();

  return equipmentTerms
    .map((term) => ({
      term,
      index: lowerText.indexOf(term.toLowerCase())
    }))
    .filter((match) => match.index >= 0)
    .sort((left, right) => left.index - right.index)
    .map((match) => match.term);
}

function extractEuroPrice(text: string): number | undefined {
  const match = text.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{2})?\s*€/);

  if (!match) {
    return undefined;
  }

  return Number(match[1].replace(/\./g, ""));
}

function extractNumberBeforeLabel(text: string, label: RegExp): number | undefined {
  const lines = text.split("\n");

  for (let index = 1; index < lines.length; index += 1) {
    if (!label.test(lines[index])) {
      continue;
    }

    const value = parseGermanNumber(lines[index - 1]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function parseGermanNumber(value: string): number | undefined {
  const match = value.match(/\d+(?:[,.]\d+)?/);

  if (!match) {
    return undefined;
  }

  return Number(match[0].replace(",", "."));
}
