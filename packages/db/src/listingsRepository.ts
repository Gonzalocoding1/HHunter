import {
  isFuzzyDuplicateListing,
  type ContactInfo,
  type Listing,
  type ListingTimelineEvent,
  type SourceId
} from "@homehunter/core";
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

export type UpdateListingExtractionInput = {
  title: string;
  location?: string;
  priceEur?: number;
  rooms?: number;
  livingAreaSqm?: number;
  floor?: string;
  equipment: string[];
  contact?: ContactInfo;
  score?: number;
  scoreLabel?: string;
  scoring?: Record<string, unknown>;
  rawData: Record<string, unknown>;
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

type TimelineEventRow = {
  id: string;
  listing_id: string;
  type: ListingTimelineEvent["type"];
  message: string;
  payload: Record<string, unknown> | null;
  created_at: Date | string;
};

type FuzzyDuplicateCandidateRow = {
  id: string;
  title: string;
  location: string | null;
  price_eur: number | null;
  rooms: number | null;
  living_area_sqm: number | null;
};

export function createListingsRepository(db: Queryable) {
  return {
    async createListing(input: CreateListingInput): Promise<Listing> {
      const id = crypto.randomUUID();
      const timelineEventId = crypto.randomUUID();
      const normalizedUrl = normalizeUrl(input.sourceUrl);
      const result = await db.query(
        `with inserted as (
          insert into listings (
            id,
            source_id,
            source_url,
            normalized_url,
            title,
            raw_data,
            review_status,
            application_status
          ) values ($1, $2, $3, $4, $5, $6, 'new', 'new')
          on conflict (normalized_url) do nothing
          returning *
        ),
        logged as (
          insert into listing_timeline_events (id, listing_id, type, message, payload)
          select $9, id, $7, 'Listing created', $8::jsonb
          from inserted
        )
        select *
        from inserted
        union all
        select *
        from listings
        where normalized_url = $4
          and not exists (select 1 from inserted)
        limit 1`,
        [
          id,
          input.sourceId,
          input.sourceUrl,
          normalizedUrl,
          input.title,
          input.rawData ?? { source: "manual" },
          "listing_created",
          { sourceId: input.sourceId },
          timelineEventId
        ]
      );

      return mapListingRow(result.rows[0] as ListingRow);
    },

    async listTimelineEvents(listingId: string): Promise<ListingTimelineEvent[]> {
      const result = await db.query(
        `select *
        from listing_timeline_events
        where listing_id = $1
        order by created_at asc`,
        [listingId]
      );

      return result.rows.map((row) => mapTimelineEventRow(row as TimelineEventRow));
    },

    async listListings(): Promise<Listing[]> {
      const result = await db.query(
        `select *
        from listings
        order by score desc, created_at desc`
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
      if (row) {
        await appendTimelineEvent(db, id, "review_decision", `Review decision: ${decision}`, { decision });
      }

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
      if (row) {
        await appendTimelineEvent(db, id, "letter_generated", "Application letter generated");
      }

      return row ? mapListingRow(row as ListingRow) : null;
    },

    async updateListingExtraction(id: string, extraction: UpdateListingExtractionInput): Promise<Listing | null> {
      const duplicateOfId = await findFuzzyDuplicateListingId(db, id, extraction);
      const status: Listing["status"] = duplicateOfId ? "duplicate" : "new";
      const result = await db.query(
        `update listings
        set title = $2,
          location = $3,
          price_eur = $4,
          rooms = $5,
          living_area_sqm = $6,
          floor = $7,
          equipment = $8,
          contact_method = $9,
          contact_email = $10,
          application_url = $11,
          contact = $12,
          score = $13,
          score_label = $14,
          status = $17,
          duplicate_of_id = $18,
          raw_data = jsonb_set(
            jsonb_set(coalesce(raw_data, '{}'::jsonb), '{extraction}', $16::jsonb, true),
            '{scoring}',
            $15::jsonb,
            true
          ),
          updated_at = now()
        where id = $1
        returning *`,
        [
          id,
          extraction.title,
          extraction.location ?? null,
          extraction.priceEur ?? null,
          extraction.rooms ?? null,
          extraction.livingAreaSqm ?? null,
          extraction.floor ?? null,
          extraction.equipment,
          inferContactMethod(extraction.contact),
          extraction.contact?.email ?? null,
          extraction.contact?.contactFormUrl ?? null,
          extraction.contact ?? null,
          extraction.score ?? 0,
          extraction.scoreLabel ?? "Nicht bewertet",
          JSON.stringify(extraction.scoring ?? {}),
          JSON.stringify(extraction.rawData),
          status,
          duplicateOfId
        ]
      );

      const row = result.rows[0];
      if (row) {
        await appendTimelineEvent(db, id, "listing_extracted", "Listing extracted", {
          score: extraction.score,
          scoreLabel: extraction.scoreLabel,
          ...(duplicateOfId ? { duplicateOfId } : {})
        });
      }

      return row ? mapListingRow(row as ListingRow) : null;
    }
  };
}

async function findFuzzyDuplicateListingId(
  db: Queryable,
  id: string,
  extraction: UpdateListingExtractionInput
): Promise<string | null> {
  const result = await db.query(
    `select id, title, location, price_eur, rooms, living_area_sqm
    from listings
    where id <> $1
      and status <> 'duplicate'
      and location is not null
      and price_eur is not null
      and rooms is not null
      and living_area_sqm is not null
    order by created_at asc`,
    [id]
  );

  const duplicate = result.rows
    .map((row) => row as FuzzyDuplicateCandidateRow)
    .filter((row) => row.id !== id)
    .find((row) =>
      isFuzzyDuplicateListing(
        {
          title: extraction.title,
          location: extraction.location,
          priceEur: extraction.priceEur,
          rooms: extraction.rooms,
          livingAreaSqm: extraction.livingAreaSqm
        },
        {
          title: row.title,
          location: row.location ?? undefined,
          priceEur: row.price_eur ?? undefined,
          rooms: row.rooms ?? undefined,
          livingAreaSqm: row.living_area_sqm ?? undefined
        }
      )
    );

  return duplicate?.id ?? null;
}

async function appendTimelineEvent(
  db: Queryable,
  listingId: string,
  type: ListingTimelineEvent["type"],
  message: string,
  payload?: Record<string, unknown>
): Promise<void> {
  await db.query(
    `insert into listing_timeline_events (id, listing_id, type, message, payload)
    values ($1, $2, $3, $4, $5)`,
    [crypto.randomUUID(), listingId, type, message, payload ?? null]
  );
}

function mapTimelineEventRow(row: TimelineEventRow): ListingTimelineEvent {
  return {
    id: row.id,
    listingId: row.listing_id,
    type: row.type,
    message: row.message,
    ...(row.payload === null ? {} : { payload: row.payload }),
    createdAt: toIsoString(row.created_at)
  };
}

function inferContactMethod(contact: ContactInfo | undefined): Listing["contactMethod"] {
  if (!contact) {
    return "form";
  }

  if (contact?.email) {
    return "email";
  }

  if (contact?.contactFormUrl) {
    return "form";
  }

  return "external";
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
