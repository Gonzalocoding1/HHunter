import type { ApplicantProfile } from "@homehunter/core";

export type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

type ApplicantProfileRow = {
  profile: ApplicantProfile | string | null;
};

export function createApplicantProfileRepository(db: Queryable) {
  return {
    async getApplicantProfile(): Promise<ApplicantProfile> {
      await ensureApplicantProfileTable(db);
      const result = await db.query(
        `select profile
        from applicant_profiles
        where id = 'default'
        limit 1`
      );

      const row = result.rows[0] as ApplicantProfileRow | undefined;
      return row ? mapApplicantProfileRow(row) : {};
    },

    async saveApplicantProfile(profile: ApplicantProfile): Promise<ApplicantProfile> {
      await ensureApplicantProfileTable(db);
      const result = await db.query(
        `insert into applicant_profiles (id, profile)
        values ($1, $2::jsonb)
        on conflict (id) do update
        set profile = excluded.profile,
          updated_at = now()
        returning profile`,
        ["default", JSON.stringify(profile)]
      );

      return mapApplicantProfileRow(result.rows[0] as ApplicantProfileRow);
    }
  };
}

async function ensureApplicantProfileTable(db: Queryable): Promise<void> {
  await db.query(
    `create table if not exists applicant_profiles (
      id text primary key,
      profile jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )`
  );
}

function mapApplicantProfileRow(row: ApplicantProfileRow): ApplicantProfile {
  if (!row.profile) {
    return {};
  }

  if (typeof row.profile === "string") {
    return JSON.parse(row.profile) as ApplicantProfile;
  }

  return row.profile;
}
