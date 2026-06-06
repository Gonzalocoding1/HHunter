export const reviewStatuses = ["new", "prepared", "reviewed", "approved", "rejected"] as const;
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

export type ReviewStatus = (typeof reviewStatuses)[number];
export type ApplicationStatus = (typeof applicationStatuses)[number];

export type SourceId = "kleinanzeigen" | "immobilie1" | "immowelt" | "immoscout24" | "manual";

export type Listing = {
  id: string;
  sourceId: SourceId;
  sourceUrl: string;
  title: string;
  location?: string;
  priceEur?: number;
  rooms?: number;
  livingAreaSqm?: number;
  floor?: string;
  equipment?: string[];
  contact?: ContactInfo;
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
