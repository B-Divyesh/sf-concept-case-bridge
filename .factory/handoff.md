# Repair handoff — Concept Case Bridge

## Status

The static application repair is complete and buildable. The production billing
catalog still lacks `concept-case-bridge`: on 2026-08-28 its required checkout
URL returned `404 {"error":"enabled factory product","status":404}`. This worker
has no factory product-registration tool or credential, so checkout enablement
remains an external release blocker even though the product links to the correct
Sociobot endpoint. Deployment and post-deploy checks are recorded below.

## Repaired verifier findings

- Import validation now checks every case field and its length, ISO-parseable
  dates, non-negative integer review counts, unique IDs, review types, review
  case relationships, and selected-choice consistency before any write.
- The app recovers legacy malformed IndexedDB records on open, removes only the
  invalid records, and tells the user what was recovered rather than requiring
  site-data deletion.
- Merge uses IndexedDB `add`, not `put`; same-ID local cases are preserved.
  The import dialog now explains collision handling and skips reviews belonging
  to a skipped imported case.
- Whitespace-only authored fields are rejected after trimming and announced in
  the form error region.
- Free users cannot import a backup that would make either Merge or Replace
  exceed 15 cases.
- License-bearing navigation URLs bypass service-worker caching. The generated
  worker has a content-versioned cache and precaches the hashed build assets.
- Footer links have 44 px mobile targets; the license restore panel is a labeled
  section rather than an invalid nested complementary landmark.
- Vite emits content-hashed JS/CSS. `staticwebapp.config.json` supplies
  immutable asset caching, service-worker revalidation, and defensive headers.

## Verification evidence (2026-08-28)

- Clean install: `npm ci` completed with 0 vulnerabilities (142 packages).
- Type/lint: `npm run lint` passed (ESLint plus TypeScript ESLint rules).
- Production build: `npm run build` passed and produced `dist/index.html`.
  Initial JS is 33,406 B (10.97 KB gzip); CSS is 19,786 B (5.27 KB gzip); both
  are below the static-product budgets. Hero desktop/mobile WebP are 139,946 B
  and 42,804 B.
- Unit + integration/browser: `npm test` passed: 8 Vitest tests and 12 Chromium
  Playwright tests. The regression set covers malformed/legacy review recovery,
  whitespace-only fields, merge collision preservation, free import ceiling,
  license cache-key privacy, 390 px footer targets, paid-view axe landmark,
  author → review, keyboard skip link, and offline reload with IndexedDB data.
- Accessibility: axe serious/critical checks pass on `/`, `/privacy/`, and
  `/terms/`; the paid view has no `landmark-complementary-is-top-level` finding.
- PWA/offline: Playwright activates the worker, sets the browser offline,
  reloads, and verifies both the Offline banner and saved case remain available.
- Local mobile Lighthouse using Playwright Chromium: Performance **99**,
  Accessibility **100**, Best Practices **100**, SEO **100**; LCP **1.6 s**,
  CLS **0**, TBT **90 ms**.

Consumer-package/CLI testing is not applicable: this repository is a static PWA,
not a published package, CLI, or backend service.

## Deployment and live checks

- Deployed to Azure Static Web Apps production with deployment ID
  `f925c3eb-5d41-4d2c-9086-f9af06c0cd80`; the custom domain returned HTTPS 200.
- `/opt/fleet/lib/verify-url.sh https://concept-case-bridge.sociobot.in` passed:
  952 ms load, no console/page errors, title/lang/one h1/main present, no missing
  image alt text, and no unlabeled buttons.
- Live root HTML, worker, hashed JS, and hashed CSS matched `dist/` byte-for-byte
  by SHA-256. Live JS/CSS now return `Cache-Control: public, max-age=31536000,
  immutable`; `sw.js` returns `no-cache, no-store, must-revalidate`.
- Live headers include the configured CSP, Permissions-Policy, X-Frame-Options,
  nosniff, and strict-origin referrer policy.
- The live checkout probe still returns the external registration failure:
  HTTP 404 with `{"error":"enabled factory product","status":404}`.

## Run and deploy

```sh
npm ci
npm run lint
npm test
npm run build
/opt/fleet/lib/deploy-static.sh concept-case-bridge dist
```

Deploy `dist/` only. Do not release paid checkout until the factory registers the
`concept-case-bridge` $19 product in the Sociobot billing catalog and the exact
checkout URL returns a hosted checkout response.

## Known gap / next action

Run the factory's missing `fleet/new-paid-product.sh` (or its equivalent) with
slug `concept-case-bridge`, product URL
`https://concept-case-bridge.sociobot.in/`, and the displayed $19 one-time price.
Then verify `GET https://api.sociobot.in/api/v1/products/concept-case-bridge/checkout`
does not return 404 before release.
