# HomeHunter Bilt App

Bilt is the review and approval app surface for HomeHunter.

This app should connect to the Codespace API and provide the mobile workflow:

```text
Create Listing -> Extract Details -> Enrich Contact -> Generate Letter -> Review -> Approve -> Ready to Send -> Track
```

## Required Screens

- `Inbox`: new and prepared listings
- `Listing Detail`: extracted listing data, source URL, duplicate status, score, score reasons, contact data and raw confidence notes
- `Letter Review`: generated German application letter with edit controls
- `Approval`: approve, reject or keep for later
- `Pipeline`: status overview and timeline for all listings
- `Search Profile`: city, budget, minimum living area, rooms and preferred equipment used for scoring

## Backend Contract

Use the current API endpoints documented in the root `README.md`.

For the hackathon, approval should mark the listing as `ready_to_send`. It must not send a real message.

## Current API Calls

- `GET /listings`: load the review inbox.
- `GET /listings/:id`: load one listing detail screen.
- `GET /listings/:id/timeline`: load the audit trail for one listing.
- `GET /search-profile`: load the configured search criteria used by relevance scoring.
- `POST /listings/:id/extract`: fetch the source page and store extracted listing facts, relevance score, score reasons and contact data found in the listing text.
- `POST /listings/:id/generate-letter`: create or refresh the German draft before review.
- `POST /listings/:id/review`: submit a user decision.
- `PUT /search-profile`: update city, budget, minimum size, rooms and preferred equipment.

Review payload:

```json
{
  "decision": "approved"
}
```

Allowed decisions:

- `approved`: user wants to continue with this listing.
- `rejected`: user does not want this listing.
- `reviewed`: user has reviewed it but has not approved it yet.

The later Bilt MCP integration should call these same API routes instead of introducing app-only state.

## Scheduler Boundary

The worker has a disabled-by-default scheduler for later automatic listing checks. The Bilt app should still treat every listing as user-reviewed state from the API. Scheduled checks must never bypass review or mark an application as sent.
