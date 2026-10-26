# Oído

[![UI and i18n smoke](https://github.com/dokarpov/oido-site/actions/workflows/ui-smoke.yml/badge.svg)](https://github.com/dokarpov/oido-site/actions/workflows/ui-smoke.yml)

**A browser-first service-commerce layer for independent hospitality and service businesses.** Oído helps merchants turn menus and service lists into mobile customer experiences: QR storefronts, demo ordering, optional tips, feedback, and merchant reporting—without replacing their existing POS.

**Stage:** Bootstrapped browser beta and merchant pilot proposition. Paid merchant adoption and live payment settlement are next-stage validation goals.

## Product case for reviewers

**Role and scope:** Daria Karpova is presented as CPO in the public [investor overview](https://dokarpov.github.io/oido-site/investors/), with responsibility for product strategy, pilot design and merchant evidence. This is a founding product exploration.

| Product question | Current decision / learning |
| --- | --- |
| Which merchant task should become easier? | Turn an existing menu or service list into a multilingual browser storefront and QR/link without replacing the current till or booking tools. |
| Where should the product intervene? | Merchant reviews uncertain extraction, guest browses and completes illustrative actions, business sees resulting activity. |
| What trade-off remains open? | A broad commerce proposition needs narrower segment, activation and operating-cost validation before claiming a repeatable business. |
| What can be inspected? | Live marketing site, investor/product walkthrough, synthetic browser states, implementation and design QA. |
| What needs validation next? | Merchant activation, willingness to pay, repeat usage and support economics. |

The next product decision depends on **observed merchant setup, guest completion, repeat use and accepted payment terms**. See [validation criteria](docs/VALIDATION.md).

## Public site

- **For businesses:** https://dokarpov.github.io/oido-site/
- **For investors and partners:** https://dokarpov.github.io/oido-site/investors/

The public-facing site and investor overview use separate HTML entry points in this repository. Both are currently hosted by GitHub Pages. The business pilot form sends submissions through FormSubmit.co to diego@sinthetic.io with a copy to dokarpov@gmail.com; delivery requires the FormSubmit recipient to activate the form. The investor meeting form currently opens a prepared email addressed to Diego with Daria in CC (the visitor must press Send). The GitHub Pages site does not host its own form backend or CRM. The repository also contains a Cloudflare Pages/Workers localization path for edge locale detection and runtime translation; those server-side functions are not executed by GitHub Pages. Prices are pilot hypotheses.

## What is real today

| Evidence | Status |
|---|---|
| Public business website | live |
| Investor / partner view | live |
| Responsive browser validation | passing at 320, 375, 390, 430, 768 and 1440 px widths |
| Automatic locale selection + compact manual language menu | implemented |
| Production locale catalogue | English, Spanish and Catalan only; other languages fall back to English |
| Edge/IP-country locale fallback + runtime translation | implemented for Cloudflare Pages/Workers, **not active on GitHub Pages** |

Next: recruit pilot merchants and measure activation, repeated use and support economics.

## Repository layout

```text
index.html             Business landing page
investors/index.html   Investor and partner overview
.nojekyll              Bypasses Jekyll processing for static hosting
README.md              Project notes
```

## Preview and publishing

Open `index.html` locally in a browser to preview the public landing page. Open `investors/index.html` for the investor version. GitHub Pages publishes the `main` branch from `/(root)`, normally within a few minutes of a commit. No build step or package manager is required.

To publish a change, update the relevant HTML file on `main`, then check the GitHub Actions **pages build and deployment** workflow and the public URL. This repository publishes the business and investor websites.

For the evidence ladder, pilot measures and decision rules, see [`docs/VALIDATION.md`](docs/VALIDATION.md).

## Product validation priorities

1. Confirm merchants' willingness to pay through evidence-grade pilots.
2. Complete licensed payment-provider integration and test live settlement, receipts, refunds, and reconciliation before any production payment claims.
3. Measure activation, recurring merchant value, acquisition, support costs and retention.
4. Validate UAE/GCC as a potential first international market; the company is currently Barcelona-based and does not claim UAE incorporation or operations.

## Contacts

Business, pilots and investor conversations: **diego@sinthetic.io**.

© 2026 Oído. All rights reserved. Repository content is public for demonstration and review; no open-source license is granted by this README.
