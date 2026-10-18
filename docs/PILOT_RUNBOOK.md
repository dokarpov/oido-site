# Oído supervised pilot — release runbook (18 October 2026)

Status: Deployable candidate on a GitHub PR, not deployed for real merchants. Main GitHub Pages website is marketing, not a transactional backend.

## Supported path
Invite merchant securely → import TXT/CSV/pasted item/price text → flag ambiguous lines for merchant review → approve all → publish public QR/link → complete a TEST guest request → staff can enable real requests during supervised hours → staff accepts/declines/fulfills → merchant sees real/test counts and exports request-status CSV.

## Unsupported boundaries
- No image or PDF OCR. A person transcribes those documents and merchants verify every line.
- No online payment, tip settlement, real booking confirmations, refunds, revenue, GMV, real POS synchronization, automatic invoices or tax filings.
- Guest language switching EN/ES/CA translates static controls, not merchant item descriptions.
- Browser demo screens on the marketing site are illustrative. This pilot candidate is separate and D1-backed.
- QR graphic currently uses a public external QR rendering service with only the public URL; sharing the link does not require this external service.
- No automatic staff push notifications. Requests are monitored with merchant dashboard polling; no unsupervised live pilot.

## Before any live pilot
1. Assign data controller and operator, review privacy/GDPR notice and processor arrangements. Do not accept guest personal details in menu text. Decide and execute evidence and D1 deletion/retention policy. IP/network logging by infrastructure may apply.
2. Create Cloudflare D1 database and a SEPARATE Cloudflare Pages pilot project, bind database as DB, initialize with pilot/schema.sql and configure a secret PILOT_ADMIN_TOKEN of at least 24 random characters. Existing GitHub Pages will never execute Functions.
3. For a dedicated deployment checkout, copy pilot/wrangler.deploy.example.toml to the root wrangler.toml and replace REPLACE_WITH_REAL_D1_DATABASE_UUID with the provisioned D1 ID. Never replace the public marketing project's configuration. The test TOML is not deployable to production.
4. Configure WAF/rate limiting for the guest request endpoint; local 250-per-merchant-per-day cap is insufficient against broader abuse. Review threat model and publish pilot-specific terms.
4. Deploy repo root using Cloudflare Pages after environment binding (do not reuse synthetic pilot/wrangler.test.toml database ID for production). Example remote initialization: wrangler d1 execute oido-pilot --remote --file pilot/schema.sql (with authenticated Cloudflare configuration and the real D1 database).
5. Verify GET /api/pilot/health is ready, invites configured and payments disabled. Run the pilot CI workflow with local D1 and Chromium and manually check phone/desktop QR scans.
6. Create invited merchant via POST /api/pilot/invite with Authorization Bearer ADMIN_TOKEN and JSON body containing name; give one-time returned merchantToken privately to merchant. Never expose access token in customer URL.
7. Obtain business consent, identify active human staff member, observe merchant correcting item prices, publish and submit a TEST guest request. Turn on real requests only with staff physically covering the pilot and dashboard open.
8. After supervised shift, log human support minutes separately; extract request CSV for verified status events. Never treat submitted intent as paid order or revenue.

## Pilot release gates
- G0: privacy and security review, D1 configured, real browser test, staff coverage and rollback plan.
- G1: first merchant successfully approves and publishes real menu, completes test and staff acknowledges it.
- G2: 8–15 merchants enrolled; report observed completion, staff response, repeat weekly actions, defects and support cost; denominator always explicit.
- G3: accepted paid terms and money collected outside beta (accounting proof), actual retention and defensible merchant economics.

## Testing
.github/workflows/pilot.yml runs domain unit tests plus real local D1, Cloudflare Pages Functions and Playwright Chromium at 390 and 1440px. Test records are synthetic and must never be counted as traction.

## Material limitations
No merchant role hierarchy, token rotation, automated backups/deletion, standardized legal terms, anti-bot challenge, live alerts, multi-location staff assignment or full WCAG audit yet. These are explicit pilot risks. Before widening beyond 1–3 supervised businesses, revisit.

See PILOT_FIELDWORK.md and PILOT_EVIDENCE_REGISTER.md.
