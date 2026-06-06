# Bilt Prompt: HunterAi Mobile App

Build a native mobile app for HunterAi, a private single-user apartment hunting assistant for Germany.

The app connects to a REST API running in a GitHub Codespace. It is the main review and approval surface.

Core workflow:

```text
Create Listing -> Extract Details -> Enrich Contact -> Generate Letter -> Review -> Approve -> Ready to Send -> Track
```

Important rule: never send an application automatically. Approval only marks a listing as ready to send.

Screens:

- Inbox with new prepared listings.
- Listing detail with price, rooms, living area, floor, equipment, location, contact person, phone, email, source and original URL.
- Letter review with editable generated German application letter.
- Approval actions: reject, later, approve.
- Pipeline overview grouped by status.

Use compact mobile UI suitable for repeated review work.
