# Independent product verification — PASS

Verified on **2026-08-28** against candidate
`7555a9ec7f0880db1dcdc26e9c163e0967fd0373` and the live URL
<https://concept-case-bridge.sociobot.in/>.

## Verdict

**PASS.** The candidate is a working local-first case-card editor and reviewer,
with validated portable backups, offline reload, an update path, accessible
desktop/mobile use, and a currently working Sociobot purchase path. The prior
verification's production checkout failure is no longer reproducible: fresh
evidence shows the configured checkout endpoint returning a hosted-checkout
redirect.

## Scope and clean-checkout gates

Testing used detached clean worktree `/tmp/ccb-verify-kxv9Ol` at the exact SHA
above; no product source was changed during verification.

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`: 141 packages, 0 vulnerabilities |
| Lint | PASS | `npm run lint` |
| Unit tests | PASS | `npm run test:unit`: 8/8 Vitest tests |
| Integration/browser tests | PASS | `npm test`: 8 Vitest tests and 12 Chromium Playwright tests |
| Exact production build | PASS | `npm run build` (`tsc --noEmit && vite build && node scripts/build-sw.mjs`) wrote `dist/` |
| Initial bundle budget | PASS | JS 33,406 B / 10.97 KB gzip; CSS 19,786 B / 5.27 KB gzip (both below 200 KB / 50 KB) |
| Media budget | PASS | desktop hero WebP 139,946 B; 390 px hero WebP 42,804 B |
| Local Lighthouse mobile | PASS | Performance 96, Accessibility 100, Best Practices 100, SEO 100; LCP 1.5 s, CLS 0, TBT 230 ms, 63 KiB transferred |

The project is a static PWA, not a library, CLI, or backend. Consumer-package,
CLI, server-concurrency, server-persistence, and health/build-identity checks do
not apply.

## Product exercise

- Authored a representative refund-webhook case, including a domain signal,
  idempotency decision, plausible debounce alternative, why-not explanation,
  and attribution. It saved and could be reviewed.
- Boundary: a 90-character title saved successfully. Whitespace-only required
  fields were rejected with the live form error “The scenario needs meaningful
  text within its limit.” After correcting them, the case saved normally.
- Wrong-answer review selected “Request debounce,” revealed the intended concept
  and counterexample, and `Record & next` scheduled the case so the desk became
  clear. Normal correct-answer review is covered by the passing browser suite.
- Invalid JSON import was rejected without losing the current case; the casebook
  remained usable. The passing suite additionally covers malformed reviews,
  legacy-record recovery, collision-safe merge, and the free 15-case import
  limit.
- Export, delete-confirmation, empty, due/clear, offline, and license-restore
  paths are covered by the passing end-to-end suite.

## PWA, privacy, accessibility, and browser policy

- Live Chromium parsed the manifest at `/manifest.webmanifest` with zero
  manifest errors and ran an active controlling service worker.
- On the live site, a newly added generic example remained visible after a
  service-worker-controlled offline reload; the Offline banner appeared and no
  console/page error occurred.
- A separate local production-artifact update simulation served worker cache
  version `v1`, then `v2`. The app displayed “A fresh workbench is ready.” with
  Reload; the replacement worker activated and the old cache was removed.
- Live axe scans of `/`, `/privacy/`, and `/terms/` found **0 serious/critical**
  violations (and no violations of any impact on those pages). At 390×844 there
  was no horizontal overflow; the first Tab reached Skip to main content with a
  visible `3px` teal outline; Enter focused `<main>`; all footer links measured
  44 px high. With reduced motion, reveal animation duration was `0.001 ms` and
  page scrolling was `auto`.
- Desktop and 390 px screenshots were visually inspected. The authoring/review
  workflow remains legible, stacked intentionally on mobile, and no content was
  clipped.
- Fresh live initial load made requests only to
  `https://concept-case-bridge.sociobot.in`; it had no console/page errors and
  no analytics, tracking, CDN font, or third-party script request. Case data is
  stored locally in IndexedDB; license/verdict are localStorage only; JSON export
  remains available without an unlock. Billing is the documented optional
  Sociobot request, not an embedded payment provider.
- Live responses include HSTS, `nosniff`, strict-origin referrer policy,
  Permissions-Policy, `X-Frame-Options: DENY`, and a CSP restricting scripts and
  assets to self and `connect-src` to the Sociobot billing origins. Hashed JS/CSS
  have `Cache-Control: public, max-age=31536000, immutable`; `sw.js` has
  `no-cache, no-store, must-revalidate`.

## Deployment identity, billing, and rate limiting

All checked live runtime artifacts SHA-256 matched the clean `dist/` build:
root HTML, worker, manifest, offline page, Privacy and Terms pages, hashed JS
and CSS, both hero WebP files, both PNG icons, SVG icon, legal CSS, robots, and
sitemap. The deployed product therefore matches the tested candidate.

- `GET https://api.sociobot.in/api/v1/products/concept-case-bridge/checkout`
  returned **303** with `Location: https://checkout.dodopayments.com/session/...`.
  This replaces the earlier report's 404 and confirms that the $19 hosted
  checkout link is presently usable.
- Invalid-token verification returned **200** with
  `{"expires_at":null,"reason":"invalid","valid":false}`, production CORS
  for the product origin, and `Cache-Control: no-store`.
- A simultaneous 100-request burst to the product's invalid-license verification
  endpoint produced 29 HTTP 200 responses and **71 HTTP 429** responses, each
  carrying `Retry-After: 4`. The first observed 429 was client request ordinal
  5 (ordinal is nondeterministic under concurrency); thus rate limiting was
  observed by the fifth queued rapid request, although this burst cannot infer a
  precise sequential threshold.

`/opt/fleet/lib/verify-url.sh https://concept-case-bridge.sociobot.in /tmp/ccb-live-verify`
also passed: HTTP 200, 745 ms load, title/lang/one h1/main
present, no missing image alt or unlabeled button, and no console/page errors.

## Defects by severity

None observed in this candidate or its matching live deployment.

## Notes

No real payment or valid production license was used; verification was limited
to the configured hosted-checkout redirect and invalid-token/restore behavior,
which avoids creating a purchase during QA. The product does not require sign-in,
so Entra tenant validation is not applicable.

## Reproduction

```sh
git worktree add --detach /tmp/ccb-verify <candidate-sha>
cd /tmp/ccb-verify
npm ci
npm run lint
npm test
npm run build
npm run preview -- --port 4174
```
