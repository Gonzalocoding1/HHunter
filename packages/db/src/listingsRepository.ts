import type { ContactInfo, Listing, SourceId } from "@homehunter/core";
import type { ReviewDecision } from "@homehunter/core";

export type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

export type CreateListingInput = {
  sourceId: SourceId;
  sourceUrl: string;
  title: string;
  rawData?: Record<string, unknown>;
};

type ListingRow = {
  id: string;
  source_id: SourceId;
  source_url: string;
  normalized_url: string;
  title: string;
  location: string | null;
  price_eur: number | null;
  rooms: number | null;
  living_area_sqm: number | null;
  floor: string | null;
  equipment: string[] | null;
  score: number;
  score_label: string;
  duplicate_of_id: string | null;
  status: Listing["status"];
  contact_method: Listing["contactMethod"];
  contact_email: string | null;
  application_url: string | null;
  contact: ContactInfo | null;
  raw_data: Record<string, unknown> | null;
  application_draft: string | null;
  application_draft_generated_at: Date | string | null;
  review_status: Listing["reviewStatus"];
  application_status: Listing["applicationStatus"];
  created_at: Date | string;
  updated_at: Date | string;
};

export function createListingsRepository(db: Queryable) {
  return {
    async createListing(input: CreateListingInput): Promise<Listing> {
      const id = crypto.randomUUID();
      const normalizedUrl = normalizeUrl(input.sourceUrl);
      const result = await db.query(
        `insert into listings (
          id,
          source_id,
          source_url,
          normalized_url,
          title,
          raw_data,
          review_status,
          application_status
        ) values ($1, $2, $3, $4, $5, $6, 'new', 'new')
        returning *`,
        [id, input.sourceId, input.sourceUrl, normalizedUrl, input.title, input.rawData ?? { source: "manual" }]
      );

      return mapListingRow(result.rows[0] as ListingRow);
    },

    async listListings(): Promise<Listing[]> {
      const result = await db.query(
        `select *
        from listings
        order by created_at desc`
      );

      return result.rows.map((row) => mapListingRow(row as ListingRow));
    },

    async getListingById(id: string): Promise<Listing | null> {
      const result = await db.query(
        `select *
        from listings
        where id = $1
        limit 1`,
        [id]
      );

      const row = result.rows[0];
      return row ? mapListingRow(row as ListingRow) : null;
    },

    async updateReviewDecision(id: string, decision: ReviewDecision): Promise<Listing | null> {
      const applicationStatus = mapDecisionToApplicationStatus(decision);
      const result = await db.query(
        `update listings
        set review_status = $2,
          application_status = $3,
          updated_at = now()
        where id = $1
        returning *`,
        [id, decision, applicationStatus]
      );

      const row = result.rows[0];
      return row ? mapListingRow(row as ListingRow) : null;
    },

    async saveApplicationDraft(id: string, draft: string): Promise<Listing | null> {
      const result = await db.query(
        `update listings
        set application_draft = $2,
          application_draft_generated_at = now(),
          application_status = 'prepared',
          updated_at = now()
        where id = $1
        returning *`,
        [id, draft]
      );

      const row = result.rows[0];
      return row ? mapListingRow(row as ListingRow) : null;
    }
  };
}

function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    sourceId: row.source_id,
    sourceUrl: row.source_url,
    normalizedUrl: row.normalized_url,
    title: row.title,
    ...(row.location === null ? {} : { location: row.location }),
    ...(row.price_eur === null ? {} : { priceEur: row.price_eur }),
    ...(row.rooms === null ? {} : { rooms: row.rooms }),
    ...(row.living_area_sqm === null ? {} : { livingAreaSqm: row.living_area_sqm }),
    ...(row.floor === null ? {} : { floor: row.floor }),
    ...(row.equipment === null ? {} : { equipment: row.equipment }),
    score: row.score,
    scoreLabel: row.score_label,
    ...(row.duplicate_of_id === null ? {} : { duplicateOfId: row.duplicate_of_id }),
    status: row.status,
    contactMethod: row.contact_method,
    ...(row.contact_email === null ? {} : { contactEmail: row.contact_email }),
    ...(row.application_url === null ? {} : { applicationUrl: row.application_url }),
    ...(row.contact === null ? {} : { contact: row.contact }),
    ...(row.raw_data === null ? {} : { rawData: row.raw_data }),
    ...(row.application_draft == null ? {} : { applicationDraft: row.application_draft }),
    ...(row.application_draft_generated_at == null
      ? {}
      : { applicationDraftGeneratedAt: toIsoString(row.application_draft_generated_at) }),
    reviewStatus: row.review_status,
    applicationStatus: row.application_status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapDecisionToApplicationStatus(decision: ReviewDecision): Listing["applicationStatus"] {
  if (decision === "approved") {
    return "ready_to_send";
  }

  if (decision === "rejected") {
    return "rejected";
  }

  return "reviewed";
}

function normalizeUrl(sourceUrl: string): string {
  const url = new URL(sourceUrl);
  url.hash = "";
  url.searchParams.sort();

  return url.toString();
}
