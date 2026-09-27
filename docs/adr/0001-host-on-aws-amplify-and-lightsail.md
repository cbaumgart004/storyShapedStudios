---
status: accepted, backend half superseded by ADR-0005
---

# Host on AWS: Amplify for the frontend, Lightsail for the backend

Vercel's Hobby plan is non-commercial only and Railway's Hobby plan is aimed at personal projects,
and this is a business site, so both are being left rather than upgraded to their paid plans
(about $40/mo against about $6 to $12/mo on AWS, 2026-09 estimates). The frontend and its images
go to Amplify, built from GitHub; the backend goes to a Lightsail **instance**, not Lambda or a
Lightsail container, because the Etsy and eBay OAuth tokens are persisted to local files
(`backend/server/utils/*TokenStorage.js`) and would be lost between invocations or on redeploy.
Neon stays as the database and Porkbun stays as registrar and DNS.

## Consequences

- One Lightsail instance runs two backends: production against the Neon main branch, preview
  against a separate Neon branch, so preview testing never touches production stock.
- `main` deploys production; a long-lived, password-protected `preview` branch deploys the site
  the client reviews. Feature branches merge into `preview`, then `preview` into `main`.
- Moving tokens into Neon would free the backend to run on Lambda or a container; until then,
  do not move it off an instance with a persistent disk.
- The instance is ours to patch, restart and put behind HTTPS.
