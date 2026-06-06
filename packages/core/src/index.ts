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
export const timelineEventTypes = [
  "listing_created",
  "listing_extracted",
  "letter_generated",
  "review_decision"
] as const;

export type ReviewStatus = (typeof reviewStatuses)[number];
export type ReviewDecision = (typeof reviewDecisions)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];
export type ListingStatus = (typeof listingStatuses)[number];
export type ContactMethod = (typeof contactMethods)[number];
export type TimelineEventType = (typeof timelineEventTypes)[number];

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

export type ListingTimelineEvent = {
  id: string;
  listingId: string;
  type: TimelineEventType;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type ScoredListingInput = {
  title: string;
  location?: string;
  priceEur?: number;
  rooms?: number;
  livingAreaSqm?: number;
  equipment?: string[];
};

export type FuzzyDuplicateListingInput = Pick<
  ScoredListingInput,
  "title" | "location" | "priceEur" | "rooms" | "livingAreaSqm"
>;

export type SearchProfile = {
  city: string;
  maxPriceEur: number;
  minLivingAreaSqm: number;
  minRooms: number;
  preferredEquipment: string[];
};

export type ApplicantProfile = {
  firstName?: string;
  lastName?: string;
  contactEmail?: string;
  phone?: string;
  salutation?: string;
  age?: number;
  budgetEur?: number;
  occupation?: string;
  education?: string;
  employer?: string;
  netIncomeEur?: number;
  guarantorAvailable?: boolean;
  householdSize?: number;
  pets?: string;
  moveInDate?: string;
  currentHousingSituation?: string;
  moveReason?: string;
  personalDescription?: string;
};

export type ListingScore = {
  score: number;
  scoreLabel: string;
  reasons: string[];
};

export const defaultSearchProfile: SearchProfile = {
  city: "Koeln",
  maxPriceEur: 1400,
  minLivingAreaSqm: 45,
  minRooms: 2,
  preferredEquipment: ["Balkon"]
};

export function scoreListing(listing: ScoredListingInput, profile: SearchProfile = defaultSearchProfile): ListingScore {
  let score = 10;
  const reasons: string[] = [];
  const normalizedCity = normalizeScoringText(profile.city);

  if (listing.priceEur !== undefined) {
    if (listing.priceEur <= profile.maxPriceEur) {
      score += 25;
      reasons.push("Preis liegt im Budget");
    } else {
      reasons.push("Preis ueber Budget");
    }
  }

  if (listing.livingAreaSqm !== undefined) {
    if (listing.livingAreaSqm >= profile.minLivingAreaSqm) {
      score += 20;
      reasons.push("Wohnflaeche passt");
    } else {
      reasons.push("Wohnflaeche zu klein");
    }
  }

  if (listing.rooms !== undefined && listing.rooms >= profile.minRooms) {
    score += 15;
    reasons.push("Zimmeranzahl passt");
  }

  if (listing.location !== undefined) {
    if (normalizeScoringText(listing.location).includes(normalizedCity)) {
      score += 20;
      reasons.push(`Lage passt zu ${profile.city}`);
    } else {
      reasons.push(`Lage ausserhalb ${profile.city}`);
    }
  }

  const preferredEquipment = profile.preferredEquipment.map((item) => normalizeScoringText(item));
  const matchingEquipment = (listing.equipment ?? []).filter((item) =>
    preferredEquipment.includes(normalizeScoringText(item))
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

export function isFuzzyDuplicateListing(
  listing: FuzzyDuplicateListingInput,
  candidate: FuzzyDuplicateListingInput
): boolean {
  if (!listing.location || !candidate.location) {
    return false;
  }

  if (normalizeDuplicateLocation(listing.location) !== normalizeDuplicateLocation(candidate.location)) {
    return false;
  }

  if (!numbersWithin(listing.priceEur, candidate.priceEur, 50)) {
    return false;
  }

  if (!numbersWithin(listing.rooms, candidate.rooms, 0)) {
    return false;
  }

  if (!numbersWithin(listing.livingAreaSqm, candidate.livingAreaSqm, 3)) {
    return false;
  }

  return titleTokenOverlap(listing.title, candidate.title) >= 0.5;
}

function normalizeScoringText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ö/g, "o");
}

function normalizeDuplicateLocation(value: string): string {
  return normalizeScoringText(value).replace(/oe/g, "o").replace(/\s+/g, " ").trim();
}

function numbersWithin(left: number | undefined, right: number | undefined, tolerance: number): boolean {
  if (left === undefined || right === undefined) {
    return false;
  }

  return Math.abs(left - right) <= tolerance;
}

function titleTokenOverlap(left: string, right: string): number {
  const leftTokens = tokenizeDuplicateTitle(left);
  const rightTokens = tokenizeDuplicateTitle(right);

  if (leftTokens.length === 0 || rightTokens.length === 0) {
    return 0;
  }

  const rightTokenSet = new Set(rightTokens);
  const matchingTokens = leftTokens.filter((token) => rightTokenSet.has(token));

  return matchingTokens.length / Math.max(leftTokens.length, rightTokens.length);
}

function tokenizeDuplicateTitle(value: string): string[] {
  const ignoredTokens = new Set(["wohnung", "zimmer", "mit", "und", "der", "die", "das", "im", "in"]);

  return normalizeScoringText(value)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !ignoredTokens.has(token));
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
