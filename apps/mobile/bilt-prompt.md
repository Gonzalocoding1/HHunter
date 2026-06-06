# Bilt Prompt: HomeHunter Mobile App

Build a native mobile app for HomeHunter, a private single-user apartment hunting assistant for Germany. The logo/short name is HHunter.

The app connects to a REST API running in a GitHub Codespace. It is the main review and approval surface.

Core workflow:

```text
Create Listing -> Extract Details -> Enrich Contact -> Generate Letter -> Review -> Approve -> Ready to Send -> Track
```

Important rule: never send an application automatically. Approval only marks a listing as ready to send.

Screens:

- Inbox with new prepared listings.
- Listing detail with duplicate status, score, score label, score reasons, price, rooms, living area, floor, equipment, location, contact person, company, phone, email, contact form, source and original URL.
- Letter review with editable generated German application letter.
- Approval actions: reject, later, approve.
- Pipeline overview grouped by status with a listing timeline/audit trail.
- Search profile settings for city, budget, minimum living area, rooms and preferred equipment.

Use compact mobile UI suitable for repeated review work.

API contract:

- `GET /listings`
- `GET /listings/:id`
- `GET /listings/:id/timeline`
- `GET /search-profile`
- `POST /listings/:id/extract`
- `POST /listings/:id/generate-letter`
- `POST /listings/:id/review` with `{ "decision": "approved" | "rejected" | "reviewed" }`
- `PUT /search-profile` with the configured city, budget, minimum size, rooms and preferred equipment

Keep review state in the HomeHunter API. Do not create separate local-only state in the app.

The backend worker may later run scheduled listing checks, but the scheduler is disabled by default and must never bypass the app review flow.
