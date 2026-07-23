---
id: 1
type: Issue
title: Set up valid Etsy & eBay OAuth tokens on deployed backend
state: New
tags: needs-triage
parent: 
created: 2026-07-21
modified: 2026-07-21
---
The backend now deploys and boots cleanly on Railway (port 8080), but has no saved marketplace tokens. Boot logs show:

- Token file does not exist.
- No saved eBay token found.
- No saved Etsy token found.

Expected for now (no valid tokens yet), so marketplace-dependent routes (/api/etsy/validate-token, /api/ebay/validate-token, live /api/ebay/dummy-listing) will not return real data until tokens exist.

Follow-ups:
- Run the Etsy and eBay OAuth flows (/auth/etsy, /auth/ebay) to obtain tokens.
- Note: tokens are currently persisted to the container filesystem via etsyTokenStorage.js / ebayTokenStorage.js (etsy_token.json / ebay_token.json). On Railway these are ephemeral and lost on redeploy/restart — consider persistent storage (env vars, DB, or a volume) before relying on them.
- Set ETSY_* and EBAY_* env vars in the Railway service (they live in backend/.env locally, which is gitignored).

