# HomeHunter

HomeHunter is a private single-user assistant for apartment hunting in Germany. The logo/short name is `HHunter`.

The product does not blindly apply to apartments. It automates the repetitive middle of the search and keeps the final decision with the user.

```text
Create Listing -> Extract Details -> Enrich Contact -> Generate Letter -> Review -> Approve -> Ready to Send -> Track
```

## Hackathon Scope

The hackathon ends at 19:00. The goal is a demo-ready foundation, not a finished automation platform.

Today we optimize for:

- clear co-development structure
- Codespaces-ready onboarding
- Playwright source checks for portals that currently work
- PostgreSQL as the persistence layer
- API contracts that the Bilt app can use
- a strict approval boundary before anything is marked ready to send

Out of scope for today:

- blind automatic applications
- real message sending
- production-grade mobile polish
- production auth
- full duplicate detection
- full AI scoring

## Product Workflow

1. `Create Listing`
   Listings can be added manually by URL. Automated discovery is planned, but does not need to work for the first demo.

2. `Extract Details`
   The worker scrapes the listing page and extracts fields such as title, location, price, rooms, living area, floor, equipment, availability, source URL and raw page snapshot.

3. `Enrich Contact`
   If the listing names a contact person or company, HomeHunter stores public contact data found in the listing or officially linked public pages, such as phone number, email address or contact form URL.

4. `Generate Letter`
   OpenAI generates a German application letter tailored to the listing, the contact person and the user profile. The API key is read from `.env` as `OPENAI_API_KEY`.

5. `Review`
   The Bilt mobile app shows the listing, extracted data, contact info and generated letter for user review.

6. `Approve`
   The user explicitly approves or rejects the prepared application. No send action happens before approval.

7. `Ready to Send`
   In the hackathon version, approval marks an application as `ready_to_send`. Actual sending is a later feature.

8. `Track`
   HomeHunter tracks the development of each listing through statuses such as `new`, `prepared`, `reviewed`, `approved`, `ready_to_send`, `responded`, `viewing_scheduled`, `rejected` and `archived`.

## Current Source Strategy

Direct Playwright works:

- `kleinanzeigen.de`
- `immobilie1.de`

Blocked or unreliable:

- `immowelt.de`: direct Playwright receives a CAPTCHA frame. ScraperAPI works generally, but immowelt failed without `ultra_premium=true`.
- `immobilienscout24.de`: ScraperAPI works for the homepage, but the search page failed without a stronger ScraperAPI mode.

## Repository Layout

```text
apps/
  api/       Fastify API for mobile app and worker controls
  worker/    Playwright fetchers, parsers and later scheduled jobs
  mobile/    Bilt app briefing and API contract entrypoint
packages/
  core/      shared domain types and workflow statuses
  db/        database connection helpers and schema boundary
  sources/   source adapter contracts and portal metadata
tests/       portal smoke checks
```

Ownership guidance for co-development:

- API features should stay in `apps/api`.
- Scraping and parsing work should stay in `apps/worker` and `packages/sources`.
- Shared workflow types belong in `packages/core`.
- Database access belongs in `packages/db`.
- Bilt-facing docs and prompts belong in `apps/mobile`.

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env`:

```bash
cp .env.example .env
```

Fill in local secrets:

```env
SCRAPERAPI_KEY=
OPENAI_API_KEY=
DATABASE_URL=postgresql://homehunter:homehunter@localhost:5432/homehunter
API_HOST=0.0.0.0
API_PORT=3000
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Apply the initial schema:

```bash
docker compose exec -T postgres psql -U homehunter -d homehunter < packages/db/src/schema.sql
```

Start the API:

```bash
npm run dev:api
```

Run the worker placeholder:

```bash
npm run dev:worker
```

Run portal smoke checks:

```bash
npm run test:smoke
```

In this environment, Playwright may need to run outside the default sandbox for Chromium to launch.

## API Plan

Initial endpoints for Bilt:

- `GET /health`
- `GET /listings`
- `GET /listings/:id`
- `POST /listings`
- `POST /listings/:id/extract`
- `POST /listings/:id/generate-letter`
- `POST /listings/:id/review`
- `POST /listings/:id/approve`
- `POST /listings/:id/ready-to-send`

## Environment

Secrets are never committed. `.env` is ignored by git. `.env.example` documents required variables.

## Collaboration Rules

- Work on separate feature branches.
- Keep shared types in `packages/core` small and deliberate.
- Do not add real sending behavior until the approval and audit flow are explicit.
- Store raw scrape snapshots for debugging parser changes.
- Prefer small vertical slices over broad rewrites during the hackathon.

## Roadmap

Phase 1:

- [x] Monorepo, Codespaces onboarding and collaboration boundaries
- [x] Manual URL ingestion
- [x] Basic Playwright fetch for `kleinanzeigen.de` and `immobilie1.de`
- [x] Minimal listing extraction
- [x] PostgreSQL persistence
- [x] Bilt app reads listings and submits review decisions
- [ ] OpenAI-generated letter draft
- [ ] Approved listings become `ready_to_send`

Phase 2:

- [ ] Better duplicate detection
- [ ] Relevance scoring
- [ ] Contact enrichment quality checks
- [ ] Source-specific parsers
- [ ] Background scheduling
- [ ] Full status timeline

Phase 3:

- [ ] Controlled send adapters
- [ ] Stronger audit logs
- [ ] Production deployment
- [ ] Auth and user settings
