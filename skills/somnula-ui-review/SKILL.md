---
name: somnula-ui-review
description: Audit and revise Somnula Studies on Shopify and GitHub, especially mobile typography, artwork framing, galleries, and storefront navigation.
---

# Somnula visual QA — mandatory design contract

Use before **every** Somnula theme review, publish decision, or visual change. Always inspect the current production version and the current candidate separately. The approved live design is the visual baseline; improve it instead of swapping to a different design. Work in an unpublished Shopify copy and publish only with explicit approval.

## Typography: mandatory, not optional

- **Never tighten letter spacing.** No negative `letter-spacing` on any text (including hero wordmarks, display headings, prices, card names, labels, mobile buttons, and footers). Don't rely on the font's default crowded kerning.
- Ensure visible air between characters: body >= `0.01em`, display/heading >= `0.015em` and preferably `0.02em`, uppercase small labels >= `0.06em`; allow an exception for an imported SVG brand mark that isn't CSS text.
- Verify glyphs don't collide, headings don't clip at screen edges, accented letters and long names still fit. Adjust size or wrapping, **not tracking below zero**, to solve overflow.
- On iOS: `-webkit-text-size-adjust:100%`; never let button and caption text scale to enormous sizes.

## Layout, cards, imagery

- On 320, 375, 390, 430, 768 and 1440px (at least), verify no unintended horizontal scroll, clipped labels, huge blank sections, overlapping UI or image cropping.
- Art inside a thin matte black frame, with visible wide passepartout (20–24% padding where feasible). Preserve the complete artwork and its proportions. Use `contain`; do not crop or simulate details not present in originals. Avoid treating a room preview as the print master.
- Image cards must be centered. Empty or broken assets show a real fallback, never giant placeholder text/numbering.
- Wall stickers: show the room / in-situ image first where available, otherwise the unaltered art.
- Mobile hero: balanced negative space, text and artwork separated, no awkward dead zone after Explore the editions; page sections follow naturally.

## Product gallery and interactions

- Only one set of gallery controls: image-only thumbnails, with clear selected state and accessible labels. No duplicate textual tabs.
- Individual artwork-specific mat choices **inside** the product card. Never a global site-wide mat selector. Changing a mat doesn't alter unrelated products.
- On mobile, product details scroll naturally without pinning half the screen or cropping a large image. Ensure swatches, price, variants and primary action are reachable; no overlapping fixed browser-like navigation.
- Previous / Next works with zero, one or several items; opening resets to the top; closing returns focus; Escape works; swipe doesn't compete with vertical scrolling. Don't introduce arrow glyphs in links.
- All anchors lead to published valid destinations. Shopify's active/live products feed must remain dynamic, preserve native product pages and variant selection. `Active` does not itself prove `availableForSale`; never imply checkout/fulfillment readiness or publish untested items.

## Review process — evidence before declaring complete

1. Compare live Shopify theme, unpublished QA theme and GitHub Studies to locate regressions; preserve production design and user-approved behavior.
2. Trace actual DOM + computed CSS precedence (especially media queries and overrides), not just search for a rule. Remove conflicting old rules rather than endlessly appending `!important`.
3. Validate inline JavaScript, Liquid/JSON integrity, gallery controls, live product feed, routes, variant states, image fallbacks.
4. Check desktop/mobile screenshots, and **interactively** test open/close, every thumbnail, mat swatches, product switch, scroll to bottom, and real product links. Record width and state; if browser interaction is unavailable, mark this unverified. Do not claim screenshots pass based on a preview URL alone.
5. Check iPhone screenshots for letter spacing and spacing/cropping defects, then fix and recheck.
6. Report exact theme ID, whether draft or live, what changed, what is still broken, what was actually tested. No publishing without owner approval.

## Visual signoff criteria

- Zero negative letter-spacing declarations affecting Somnula.
- No visible numbering or redundant section headings.
- No duplicate navigation / gallery / mat selectors.
- Images fully visible with generous mounts; no giant empty blocks or oversized placeholders.
- No false claim that a static preview equals a sale-ready Shopify listing.
