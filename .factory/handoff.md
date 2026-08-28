# Handoff — Concept Case Bridge

## Shipped

- A production Vite + TypeScript PWA implementing the complete local case loop:
  create/edit/delete, explicit domain signal and concept, hidden decision,
  plausible alternative, “why not” explanation, attribution, review result, and
  delayed next-check scheduling.
- IndexedDB persistence for cases and review history, with validated JSON
  merge/replace import and full JSON export. Destructive deletion names the case
  and removes its review history only after confirmation.
- A useful free tier (15 cases, review, offline, import/export) and a $19 one-time
  license tier (unlimited cases plus recent review history). Checkout and daily
  cached verification follow the Sociobot slug endpoint; the free experience never
  waits on verification. Restore-by-token and returned `?license=` capture exist.
- Installable manifest, 192/512 icons, versioned app-shell cache, cache-first local
  assets, network-first navigation, offline fallback, saved-work offline reload,
  and update notification.
- A product-specific risograph “decision workshop” system, responsive to 390 px,
  with original generated artwork. The prompt, source, and provenance are in
  `.factory/design.md` and `assets/src/`; shipped WebP variants are 140 KB and
  44 KB.
- Empty, loading, offline, validation, storage-error, due/complete, license, and
  destructive-confirmation states; keyboard focus treatment and reduced-motion
  fallback; privacy and terms pages; crawl metadata.

## Verification (2026-08-28)

- `npm test`: **6 Vitest + 5 Playwright tests passed**. Coverage includes the
  author→review→counterexample→schedule loop, 390 px keyboard/skip-link behavior,
  license copy/restore, offline service-worker reload with persisted IndexedDB
  content, and axe on `/`, `/privacy/`, and `/terms/`.
- Axe: **0 serious or critical violations** on the app and both legal routes.
- `npm run build`: passes; output is `dist/`, with `dist/index.html` at its root.
- Production output: **30.18 KB JS (10.01 KB gzip)**, **19.70 KB CSS (5.25 KB
  gzip)**, hero **140 KB desktop / 44 KB mobile**. There are no runtime font or
  analytics requests.
- Lighthouse 12.8.2, mobile emulation, local production preview:
  **Performance 100, Accessibility 100, Best Practices 100, SEO 100**;
  LCP **1.5 s**, CLS **0**, total blocking time **0 ms**, FCP **0.9 s**.
- Visual inspection performed at 1440×1100, 390×844 library, and 390×844 review.
  No console errors were observed in the end-to-end run.

## Run / deploy

```sh
npm install
npm test
npm run build
```

Deploy the contents of `dist/`. Cache hashed/static assets long-term, but serve
`sw.js` with revalidation. The optional staging billing build is:
`VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build`.

## Known gaps / factory follow-up

- The factory must register `concept-case-bridge` in the Sociobot billing engine
  and align checkout to the displayed **$19 one-time** price before taking payment.
  No product ID is hardcoded.
- Review scheduling is intentionally compact and local (1/3/7/14-day spacing),
  not a configurable spaced-repetition algorithm. There is no account, cloud sync,
  automatic case generation, marketplace, or certification scoring—these are
  outside the researched v1.
- Browser/site-data deletion can erase the local casebook; the UI therefore keeps
  export available in the free tier and explains backups in the privacy policy.
