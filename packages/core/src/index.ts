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
