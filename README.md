# Tay März — Portfolio & Sell Page

Single-page freelance portfolio with a live, interactive package builder.
Zero external requests, no frameworks, no build step, no trackers.

## Files
- `index.html` — page markup + styles (system fonts, purple/dark theme)
- `app.js` — renders content sections + wires the package builder & contact form
- `pricing.js` — pure pricing logic (shared by page + tests)
- `test_pricing.js` — runnable check for the money path (`node test_pricing.js`)

## Local preview
Any static server, e.g.:
```
python3 -m http.server 8080
# open http://localhost:8080
```

## Before going live (placeholders to fill)
1. **Prices** — all €-values live in `pricing.js` (`BASES`, `ADDONS`, `SUPPORT`). Edit freely.
2. **Contact form** — `app.js` `wireForm()` validates but does not deliver. Point it at a
   real endpoint (Formspree, a mailto fallback, or your own handler) where noted by the
   `ponytail:` comment.
3. **Projects / copy** — content arrays at the top of `app.js` (`PROJECTS`, `SERVICES`, `STEPS`).

## Notes
- Accessibility: text contrast meets WCAG AA; respects `prefers-reduced-motion`.
- Scroll-reveal is JS-gated (`html.js`) so the page is fully readable without JavaScript.
