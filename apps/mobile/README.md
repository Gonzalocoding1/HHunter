# HomeHunter Bilt App

Bilt is the review and approval app surface for HomeHunter.

This app should connect to the Codespace API and provide the mobile workflow:

```text
Create Listing -> Extract Details -> Enrich Contact -> Generate Letter -> Review -> Approve -> Ready to Send -> Track
```

## Required Screens

- `Inbox`: new and prepared listings
- `Listing Detail`: extracted listing data, source URL, contact data and raw confidence notes
- `Letter Review`: generated German application letter with edit controls
- `Approval`: approve, reject or keep for later
- `Pipeline`: status overview for all listings

## Backend Contract

Use the current API endpoints documented in the root `README.md`.

For the hackathon, approval should mark the listing as `ready_to_send`. It must not send a real message.

## Current API Calls

- `GET /listings`: load the review inbox.
- `GET /listings/:id`: load one listing detail screen.
- `POST /listings/:id/extract`: fetch the source page and store extracted listing facts.
- `POST /listings/:id/generate-letter`: create or refresh the German draft before review.
- `POST /listings/:id/review`: submit a user decision.

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
