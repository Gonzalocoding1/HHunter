import type { SearchProfile } from "@homehunter/core";

export type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

type SearchProfileRow = {
  city: string;
  max_price_eur: number;
  min_living_area_sqm: number;
  min_rooms: number;
  preferred_equipment: string[];
};

export function createSearchProfileRepository(db: Queryable) {
  return {
    async getSearchProfile(): Promise<SearchProfile | null> {
      const result = await db.query(
        `select *
        from search_profiles
        where id = 'default'
        limit 1`
      );

      const row = result.rows[0];
      return row ? mapSearchProfileRow(row as SearchProfileRow) : null;
    },

    async saveSearchProfile(profile: SearchProfile): Promise<SearchProfile> {
      const result = await db.query(
        `insert into search_profiles (
          id,
          city,
          max_price_eur,
          min_living_area_sqm,
          min_rooms,
          preferred_equipment
        ) values ($1, $2, $3, $4, $5, $6)
        on conflict (id) do update
        set city = excluded.city,
          max_price_eur = excluded.max_price_eur,
          min_living_area_sqm = excluded.min_living_area_sqm,
          min_rooms = excluded.min_rooms,
          preferred_equipment = excluded.preferred_equipment,
          updated_at = now()
        returning *`,
        [
          "default",
          profile.city,
          profile.maxPriceEur,
          profile.minLivingAreaSqm,
          profile.minRooms,
          profile.preferredEquipment
        ]
      );

      return mapSearchProfileRow(result.rows[0] as SearchProfileRow);
    }
  };
}

function mapSearchProfileRow(row: SearchProfileRow): SearchProfile {
  return {
    city: row.city,
    maxPriceEur: row.max_price_eur,
    minLivingAreaSqm: row.min_living_area_sqm,
    minRooms: row.min_rooms,
    preferredEquipment: row.preferred_equipment
  };
}
