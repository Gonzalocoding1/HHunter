import type { ContactInfo, SourceId } from "@homehunter/core";

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
  floor?: string;
  equipment: string[];
  contact?: ContactInfo;
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
    floor: extractFloor(text),
    equipment: extractEquipment(text),
    contact: extractContact(text),
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

  for (let index = 0; index < lines.length; index += 1) {
    const currentLine = lines[index];
    if (!label.test(currentLine)) {
      continue;
    }

    const inlineValue = parseGermanNumber(currentLine);
    if (inlineValue !== undefined) {
      return inlineValue;
    }

    if (index === 0) {
      continue;
    }

    const value = parseGermanNumber(lines[index - 1]);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function extractFloor(text: string): string | undefined {
  const match = text.match(/\b(?:etage|geschoss)\s*[:\-]?\s*([A-Za-zÄÖÜäöüß0-9. \-]+)/i);

  return match?.[1]?.trim();
}

function extractContact(text: string): ContactInfo | undefined {
  const contact: ContactInfo = {};
  const email = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)?.[0];
  const phone = extractLabeledValue(text, /\b(?:telefon|tel\.?|mobil)\b/i);
  const name = extractLabeledValue(text, /(?:kontaktperson|ansprechpartner(?:in)?)/i);
  const company = extractCompany(text);
  const contactFormUrl = extractLabeledUrl(text, /kontaktformular/i);

  if (name) {
    contact.name = name;
  }

  if (company) {
    contact.company = company;
  }

  if (phone) {
    contact.phone = phone;
  }

  if (email) {
    contact.email = email;
  }

  if (contactFormUrl) {
    contact.contactFormUrl = contactFormUrl;
  }

  return Object.keys(contact).length > 0 ? contact : undefined;
}

function extractLabeledValue(text: string, label: RegExp): string | undefined {
  const lines = text.split("\n");

  for (const line of lines) {
    if (!label.test(line)) {
      continue;
    }

    const value = line.replace(label, "").replace(/^[\s:.-]+/, "").trim();
    return value || undefined;
  }

  return undefined;
}

function extractLabeledUrl(text: string, label: RegExp): string | undefined {
  const value = extractLabeledValue(text, label);

  return value?.match(/https?:\/\/\S+/i)?.[0];
}

function extractCompany(text: string): string | undefined {
  const lines = text.split("\n");
  const providerIndex = lines.findIndex((line) => /^anbieter$/i.test(line.trim()));

  if (providerIndex >= 0) {
    return lines[providerIndex + 1]?.trim() || undefined;
  }

  return extractLabeledValue(text, /(?:anbieter|firma|unternehmen)/i);
}

function parseGermanNumber(value: string): number | undefined {
  const match = value.match(/\d+(?:[,.]\d+)?/);

  if (!match) {
    return undefined;
  }

  return Number(match[0].replace(",", "."));
}
