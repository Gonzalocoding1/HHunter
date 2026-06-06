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
  application_draft text,
  application_draft_generated_at timestamptz,
  review_status text not null default 'new',
  application_status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists listings_normalized_url_idx on listings (normalized_url);
create index if not exists listings_application_status_idx on listings (application_status);
create index if not exists listings_status_idx on listings (status);
create index if not exists listings_duplicate_of_id_idx on listings (duplicate_of_id);

alter table listings add column if not exists application_draft text;
alter table listings add column if not exists application_draft_generated_at timestamptz;

create table if not exists listing_timeline_events (
  id text primary key,
  listing_id text not null references listings(id) on delete cascade,
  type text not null,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists listing_timeline_events_listing_id_idx on listing_timeline_events (listing_id, created_at);

create table if not exists search_profiles (
  id text primary key,
  city text not null,
  max_price_eur integer not null,
  min_living_area_sqm integer not null,
  min_rooms numeric not null,
  preferred_equipment text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applicant_profiles (
  id text primary key,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
