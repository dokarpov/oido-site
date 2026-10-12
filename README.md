# Oído

[![UI and i18n smoke](https://github.com/dokarpov/oido-site/actions/workflows/ui-smoke.yml/badge.svg)](https://github.com/dokarpov/oido-site/actions/workflows/ui-smoke.yml)

**A browser-first service-commerce layer for independent hospitality and service businesses.** Oído helps merchants turn menus and service lists into mobile customer experiences: QR storefronts, demo ordering, optional tips, feedback, and merchant reporting—without replacing their existing POS.

**Status:** pre-incorporation, bootstrapped, pre-seed working browser beta. The public website demonstrates a product concept and pilot offering; production payment settlement, paying merchants, GMV, and revenue are **not** being claimed as verified.

## Public site

- **For businesses:** https://dokarpov.github.io/oido-site/
- **For investors and partners:** https://dokarpov.github.io/oido-site/investors/

The public-facing site and investor overview use separate HTML entry points in this repository. Both are currently hosted by GitHub Pages. The business pilot form sends submissions through FormSubmit.co to diego@sinthetic.io with a copy to dokarpov@gmail.com; delivery requires the FormSubmit recipient to activate the form. The investor meeting form currently opens a prepared email addressed to Diego with Daria in CC (the visitor must press Send). The GitHub Pages site does not host its own form backend or CRM. The repository also contains a Cloudflare Pages/Workers localization path for edge locale detection and runtime translation; those server-side functions are not executed by GitHub Pages. Prices and commercial terms presented on the site are hypotheses pending paid-merchant validation.

## What is real today

| Evidence | Status |
|---|---|
| Public business website | live |
| Investor / partner view | live |
| Responsive browser validation | passing at 320, 375, 390, 430, 768 and 1440 px widths |
| Automatic locale selection + compact manual language menu | implemented |
| Production locale catalogue | English, Spanish and Catalan only; other languages fall back to English |
| Edge/IP-country locale fallback + runtime translation | implemented for Cloudflare Pages/Workers, **not active on GitHub Pages** |
| Payment settlement | **not live / not claimed** |
| Paying merchants, GMV, revenue | **not yet claimed as verified** |
| Prices / commercial terms | hypotheses pending paid validation |

This is deliberately a **working product and pilot proposition, not a fabricated traction story**. The next credibility step is external: paid merchant evidence, activation/usage, repeat value and support economics.

## Repository layout

```text
index.html             Business landing page
investors/index.html   Investor and partner overview
.nojekyll              Bypasses Jekyll processing for static hosting
README.md              Project notes
```

## Preview and publishing

Open `index.html` locally in a browser to preview the public landing page. Open `investors/index.html` for the investor version. GitHub Pages publishes the `main` branch from `/(root)`, normally within a few minutes of a commit. No build step or package manager is required.

To publish a change, update the relevant HTML file on `main`, then check the GitHub Actions **pages build and deployment** workflow and the public URL. This is a marketing/investor website, not the Oído application backend.

For the evidence ladder, pilot measures and decision rules, see [`docs/VALIDATION.md`](docs/VALIDATION.md).

## Product validation priorities

1. Confirm merchants' willingness to pay through evidence-grade pilots.
2. Complete licensed payment-provider integration and test live settlement, receipts, refunds, and reconciliation before any production payment claims.
3. Measure activation, recurring merchant value, acquisition, support costs and retention.
4. Validate UAE/GCC as a potential first international market; the company is currently Barcelona-based and does not claim UAE incorporation or operations.

## Contacts

Business, pilots and investor conversations: **diego@sinthetic.io**.

© 2026 Oído. All rights reserved. Repository content is public for demonstration and review; no open-source license is granted by this README.
