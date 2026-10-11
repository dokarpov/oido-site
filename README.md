# Oído

**A browser-first service-commerce layer for independent hospitality and service businesses.** Oído helps merchants turn menus and service lists into mobile customer experiences: QR storefronts, demo ordering, optional tips, feedback, and merchant reporting—without replacing their existing POS.

**Status:** pre-incorporation, bootstrapped, pre-seed working browser beta. The public website demonstrates a product concept and pilot offering; production payment settlement, paying merchants, GMV, and revenue are **not** being claimed as verified.

## Public site

- **For businesses:** https://dokarpov.github.io/oido-site/
- **For investors and partners:** https://dokarpov.github.io/oido-site/investors/

The public-facing site and investor overview use separate HTML entry points in this repository. Both are static web pages hosted by GitHub Pages. Current enquiry forms prepare an email in the visitor's email app; there is no form backend, CRM integration, or stored submission. Prices and commercial terms presented on the site are hypotheses pending paid-merchant validation.

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

## Product validation priorities

1. Confirm merchants' willingness to pay through evidence-grade pilots.
2. Complete licensed payment-provider integration and test live settlement, receipts, refunds, and reconciliation before any production payment claims.
3. Measure activation, recurring merchant value, acquisition, support costs and retention.
4. Validate UAE/GCC as a potential first international market; the company is currently Barcelona-based and does not claim UAE incorporation or operations.

## Contacts

Business, pilots and investor conversations: **diego@sinthetic.io**.

© 2026 Oído. All rights reserved. Repository content is public for demonstration and review; no open-source license is granted by this README.
