# Tay März · Portfolio & Sell Page

Single-page freelance portfolio with a live package builder, a contact form, and a small admin CMS.
No frameworks, no build step, no trackers, zero third-party requests on the public page.

## Files
- `index.html` + `style.css`: page markup and styles (`style.css` is shared with `datenschutz.html`)
- `app.js`: renders everything, hash router (`#/p/<slug>`, `#/about`, `#/security`), builder, contact form
- `i18n.js`: all EN/DE copy, the project list (array order = order on the page), stack, testimonials
- `pricing.js`: pure pricing logic + default prices (shared by page, server and `node test_pricing.js`)
- `admin.html` + `admin.js`: admin panel at `/admin` (leads, ?ref= analytics, projects, pricing, testimonials, text, layout)
- `sw.js`: admin service worker, push notifications only (no fetch handler, never caches)
- `server.js`: static server (whitelist), contact intake, web push, admin API

## Run
```
npm install
node server.js          # PORT=2500 by default
```
Needs `admin-config.json` (`subject`, `vapidPublic`, `vapidPrivate`, `adminToken`). Runtime data
(`contacts.jsonl`, `overrides.json`, `analytics.json`, `push-subs.json`, `uploads/`) is git-ignored.

## How admin edits work
Defaults live in `i18n.js` / `pricing.js`. The admin saves only what differs from them into
`overrides.json`; the page merges that over the defaults on load. Once the project list or pricing
has been edited in the admin, that saved list wins. Projects added to `i18n.js` later show up in
the admin's Projects tab with an "Add them" prompt.

## Tracking links
Share `https://<site>/?ref=<source>`. Each source is counted once per visitor per 30 min, per day,
with no cookies and no IPs stored. Build links in Admin → Analytics → Link builder.
