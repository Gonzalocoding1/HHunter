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

Use the API endpoints documented in the root `README.md`.

For the hackathon, approval should mark the listing as `ready_to_send`. It must not send a real message.
