export const reviewStatuses = ["new", "prepared", "reviewed", "approved", "rejected"] as const;
export const reviewDecisions = ["approved", "rejected", "reviewed"] as const;
export const applicationStatuses = [
  "new",
  "prepared",
  "reviewed",
  "approved",
  "ready_to_send",
  "responded",
  "viewing_scheduled",
  "rejected",
  "archived"
] as const;
export const listingStatuses = ["new", "ignored", "duplicate", "error"] as const;
export const contactMethods = ["form", "email", "external"] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];
export type ReviewDecision = (typeof reviewDecisions)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type ListingStatus = (typeof listingStatuses)[number];
export type ContactMethod = (typeof contactMethods)[number];

export type SourceId = "kleinanzeigen" | "immobilie1" | "immowelt" | "immoscout24" | "manual";

export type Listing = {
  id: string;
  sourceId: SourceId;
  sourceUrl: string;
  normalizedUrl: string;
  title: string;
  location?: string;
  priceEur?: number;
  rooms?: number;
  livingAreaSqm?: number;
  floor?: string;
  equipment?: string[];
  score: number;
  scoreLabel: string;
  duplicateOfId?: string;
  status: ListingStatus;
  contactMethod: ContactMethod;
  contactEmail?: string;
  applicationUrl?: string;
  contact?: ContactInfo;
  rawData?: Record<string, unknown>;
  applicationDraft?: string;
  applicationDraftGeneratedAt?: string;
  reviewStatus: ReviewStatus;
  applicationStatus: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContactInfo = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  contactFormUrl?: string;
};

export type ScoredListingInput = {
  title: string;
  location?: string;
  priceEur?: number;
  rooms?: number;
  livingAreaSqm?: number;
  equipment?: string[];
};

export type ListingScore = {
  score: number;
  scoreLabel: string;
  reasons: string[];
};

const defaultScoringProfile = {
  maxPriceEur: 1400,
  minLivingAreaSqm: 45,
  minRooms: 2,
  preferredLocation: "koeln",
  preferredEquipment: ["balkon"]
};

export function scoreListing(listing: ScoredListingInput): ListingScore {
  let score = 10;
  const reasons: string[] = [];

  if (listing.priceEur !== undefined) {
    if (listing.priceEur <= defaultScoringProfile.maxPriceEur) {
      score += 25;
      reasons.push("Preis liegt im Budget");
    } else {
      reasons.push("Preis ueber Budget");
    }
  }

  if (listing.livingAreaSqm !== undefined) {
    if (listing.livingAreaSqm >= defaultScoringProfile.minLivingAreaSqm) {
      score += 20;
      reasons.push("Wohnflaeche passt");
    } else {
      reasons.push("Wohnflaeche zu klein");
    }
  }

  if (listing.rooms !== undefined && listing.rooms >= defaultScoringProfile.minRooms) {
    score += 15;
    reasons.push("Zimmeranzahl passt");
  }

  if (listing.location !== undefined) {
    if (normalizeScoringText(listing.location).includes(defaultScoringProfile.preferredLocation)) {
      score += 20;
      reasons.push("Lage passt zu Koeln");
    } else {
      reasons.push("Lage ausserhalb Koeln");
    }
  }

  const matchingEquipment = (listing.equipment ?? []).filter((item) =>
    defaultScoringProfile.preferredEquipment.includes(normalizeScoringText(item))
  );

  if (matchingEquipment.length > 0) {
    score += 10;
    reasons.push(`Ausstattung passt: ${matchingEquipment.join(", ")}`);
  }

  const cappedScore = Math.min(score, 100);

  return {
    score: cappedScore,
    scoreLabel: scoreLabelFor(cappedScore),
    reasons
  };
}

function normalizeScoringText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ö/g, "o");
}

function scoreLabelFor(score: number): string {
  if (score >= 80) {
    return "Top Match";
  }

  if (score >= 55) {
    return "Gute Prioritaet";
  }

  return "Niedrige Prioritaet";
}
