create table if not exists listings (
  id text primary key,
  source_id text not null,
  source_url text not null,
  normalized_url text not null,
  title text not null,
  location text,
  price_eur integer,
  rooms numeric,
  living_area_sqm numeric,
  floor text,
  equipment text[] default '{}',
  score integer not null default 0,
  score_label text not null default 'Nicht bewertet',
  duplicate_of_id text references listings(id),
  status text not null default 'new',
  contact_method text not null default 'form',
  contact_email text,
  application_url text,
  contact jsonb,
  raw_data jsonb,
  review_status text not null default 'new',
  application_status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists listings_normalized_url_idx on listings (normalized_url);
create index if not exists listings_application_status_idx on listings (application_status);
create index if not exists listings_status_idx on listings (status);
