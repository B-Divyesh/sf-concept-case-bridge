# Review 2 — Practice technical choices in business cases

Reviewed on 2026-09-05.

## Verdict: PASS

**PASS — 0 findings and 0 untested public claims.** The reviewed product
implementation is `df9afa52f7df33dead0426d2a83569407ed61ba8`. The
documentation baseline at the start of this review is
`1e47b96707bb9bb4b6d50fd815f71737f2c58f9e`; it contains reports only and does
not change the runtime. The live runtime at
<https://concept-case-bridge.sociobot.in> matched the implementation build.

## Job, audience, and first action

The job is to practise choosing the right technical concept in a realistic
business case. It is for professionals learning a technical stack and an
unfamiliar business domain together. Before scrolling, fresh desktop and phone
browsers show the H1, the audience sentence, **Try it with sample data**, its
next-step sentence, and local/offline/price facts. In a 390 px-wide phone
viewport the sample action occupies CSS pixels 481–533, so it is available in
both 664 px and 844 px-high phone viewports.

## Clean checkout and claims

A detached clean worktree at the implementation SHA was installed with `npm ci`.
No product source was changed during this review.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 141 packages installed; 0 vulnerabilities reported. |
| `npm run lint` | PASS. |
| `npm test` | PASS — 8 Vitest and 25 Chromium tests. |
| `npm run build` | PASS — writes `dist/index.html`; JS 40,221 B and CSS 22,212 B before gzip. |

Every command declared in `.factory/claims.json` was invoked separately from
that clean checkout. Each command ran exactly one tagged Chromium test and
passed.

| Claim | Result |
| --- | --- |
| `demo-isolation` | PASS |
| `core-review` | PASS |
| `local-storage` | PASS |
| `json-export` | PASS |
| `validated-import` | PASS |
| `pwa-install` | PASS |
| `offline-reload` | PASS |
| `free-case-limit` | PASS |
| `paid-unlimited` | PASS — recorded valid billing response only; no purchase was made. |
| `no-tracking-cdn` | PASS |
| `no-case-upload` | PASS |

There are 11 listed public claims, one command per claim, and no untested
claim. The landing page, README, Privacy, and Terms copy were cross-checked
against this ledger; their testable storage, demo, review, export, import,
offline, free-limit, license, tracking, and upload promises are covered by the
corresponding claim tests.

## Live product checks

- Fresh desktop and iPhone-13 phone contexts loaded the landing page with HTTP
  200, the correct title, one H1, `lang=en`, no horizontal overflow, and no
  console or page errors. Screenshots are in `/work/.evidence/review-2/`.
- The one-click sample opened `/demo` with three realistic cases, the persistent
  “Demo — sample data, nothing is saved” label, and no real case visible. A
  wrong selection remained hidden until reveal, then showed the decision and
  why the alternative failed. Reset restored all three original cases; Start
  for real removed the label and returned to the untouched real casebook.
- Normal authoring/review, whitespace-only validation, malformed-import
  rejection, legacy malformed-record recovery, 16-case free-limit rejection,
  collision-safe merge, export, and license-cache handling passed in the clean
  browser suite. These cover normal, invalid, boundary, and recovery paths.
- Keyboard smoke checks put Skip to main content first; Enter focused `main`.
  Keyboard navigation to Review moved focus to its H1. At 390 px no horizontal
  overflow occurred. With reduced motion, animation and transition durations
  were `1e-06s`.
- Live axe scans found no serious or critical violations on `/`, `/demo`,
  `/write`, `/review`, `/pricing`, `/privacy/`, `/terms/`, and the designed
  missing-page response. `verify-url.sh` passed with title, lang, main, alt
  text, labelled controls, and no console/page errors.
- All live links returned 200, explicit `mailto:`, or the expected 303 hosted
  checkout redirect. `/does-not-exist` deliberately returned HTTP 404 with its
  own title, H1, main landmark, and a return link; its browser 404 resource log
  is expected and not a defect.
- In a dedicated fresh browser context, `/demo` became service-worker
  controlled after an online visit and reopened offline with the Offline status
  and saved sample case visible. The manifest parsed, declares standalone
  display, and its icons and service worker passed the install claim.
- The security headers include CSP, HSTS, nosniff, referrer policy,
  Permissions-Policy, and anti-framing. Hashed assets use one-year immutable
  caching; `sw.js` uses no-cache. The checkout endpoint returned HTTP 303 to
  hosted checkout. No payment was attempted.

All 19 public runtime files in the clean implementation build matched their
live counterparts byte-for-byte: root, app assets, service worker, manifest,
offline and 404 pages, legal pages, icons, images, sitemap, and robots. The
Static Web Apps configuration is deployment configuration rather than a public
runtime file.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Checkout returned 404 | Fixed — live checkout returned HTTP 303. |
| Malformed review broke the casebook | Fixed — validation rejection and legacy-record recovery tests pass. |
| Merge overwrote a same-ID local case | Fixed — collision test preserves the local case. |
| Whitespace required fields saved | Fixed — meaningful-text validation rejects them. |
| Free limit could be bypassed by import | Fixed — valid 16-case import is rejected when unlicensed. |
| License token entered the worker cache | Fixed — regression test finds no returned token in Cache Storage. |
| Footer targets and paid-page landmark issue | Fixed — target/landmark regression and live axe checks pass. |
| Static assets lacked immutable caching | Fixed — live hashed JS/CSS return one-year immutable caching. |
| Manifest MIME and missing security headers | Fixed — live manifest and CSP/security headers are present. |
| One-click demo was not isolated | Fixed — live isolation, reset, and exit behavior passed. |
| Claims ledger and claim tests were missing | Fixed — 11 listed claims all passed independently. |
| First screen was not plain or complete | Fixed — fresh desktop and phone show job, audience, action, next step, and facts. |
| Unknown route rendered the app | Fixed — live unknown route is a designed HTTP 404. |

This is a static local-first PWA, not a backend, CLI, library, or desktop
product. Tenant isolation, server restart persistence, health endpoints, and
product-server 429 checks do not apply. Billing verification was limited to the
documented hosted-checkout redirect and the recorded test response used by the
claim suite.

## Evidence and reproduction

Evidence is in `/work/.evidence/review-2/`. The required result files are
`/work/.evidence/qa-report.md` and `/work/.evidence/qa-result.json`.

```sh
git worktree add --detach /tmp/ccb-review-2 df9afa5
cd /tmp/ccb-review-2
npm ci
npm run lint
npm test
npm run build
npm run test:claims -- --grep @claim:demo-isolation
# Run the remaining ten commands from .factory/claims.json in the same form.
```
