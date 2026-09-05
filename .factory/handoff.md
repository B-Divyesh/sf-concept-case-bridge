# Repair 2 handoff — Concept Case Bridge

## Status: PASS

Repair 2 was completed and deployed on 2026-09-05. The implementation SHA is
`df9afa52f7df33dead0426d2a83569407ed61ba8`. The live runtime matches that
implementation. This handoff is a later documentation-only change and does not
require another product deployment.

Live product: <https://concept-case-bridge.sociobot.in>

## Work completed

- Added a one-click `/demo` with three realistic cases and one review.
- Isolated demo data in IndexedDB `demo:concept-case-bridge` and demo license
  state under `demo:` localStorage keys.
- Added the persistent required demo label, **Reset demo**, and **Start for
  real**. Reset and exit affect only demo data.
- Added [`.factory/claims.json`](claims.json) with 11 public claims and exactly
  one tagged browser test for each claim.
- Replaced the first screen with a direct job statement, named audience, sample
  action, next-step explanation, and three plain facts.
- Added [`.factory/copy-audit.md`](copy-audit.md); no sentence exceeds 22 words
  and no banned word remains in the audited landing copy.
- Added real `/write`, `/review`, and `/pricing` routes with route titles,
  reload support, browser back/forward support, and heading focus.
- Added a designed `404.html`. Unknown live URLs now return HTTP 404 with that
  document instead of the application shell.
- Rewrote the Privacy and Terms headings and text in plain words.
- Added route metadata, a 1200×630 social image, a 180 px Apple touch icon,
  sitemap entries, manifest MIME configuration, and complete security headers.
- Removed inline styling from the offline fallback so the site CSP stays clean.
- Kept all earlier data-integrity, license-cache, accessibility, and cache fixes.

## Current and earlier findings

| Finding | Disposition and evidence |
| --- | --- |
| No isolated one-click demo | Fixed. A live fresh-context test seeded a real case, entered `/demo`, found only three samples, edited and reset the demo, then returned to the untouched real case. |
| Missing claims ledger and nine untested claims | Fixed. The ledger contains 11 claims. Every listed command passed separately in the clean worktree. |
| First screen did not state job, audience, and action | Fixed. At 390×844 the job, audience, sample action, next step, and three facts end at 764 px. |
| Unknown URLs rendered the app | Fixed. Live `/does-not-exist` returns HTTP 404, the correct title, one H1, a main landmark, and a link home. The browser’s failed-resource console message is the expected result of the deliberate 404. |
| Checkout returned 404 | Remains fixed. The production checkout endpoint returned HTTP 303 to hosted checkout on 2026-09-05. |
| Malformed review broke the casebook | Remains fixed. Unit and browser recovery tests pass. |
| Merge overwrote a same-ID local case | Remains fixed. The collision test proves the local record remains. |
| Whitespace fields saved | Remains fixed. The browser test gets a meaningful-text error and no saved case. |
| Import bypassed the 15-case limit | Remains fixed. Both regression and claim tests reject a 16-case free import. |
| License token entered the worker cache | Remains fixed. The cache test finds no returned token in Cache Storage. |
| Small footer targets and nested landmark | Remains fixed. Footer targets measure at least 44 px and axe finds no nested complementary landmark. |
| Static assets lacked immutable caching | Remains fixed. Live hashed JS and CSS return one-year immutable cache headers. |

## Clean-checkout verification

A detached worktree at the implementation SHA was created at
`/tmp/ccb-repair2-clean-CFYFhc`.

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 141 packages, 0 vulnerabilities |
| `npm run lint` | PASS |
| `npm test` | PASS — 8 unit and 25 Chromium tests |
| `npm run build` | PASS — writes `dist/` with `index.html` at its root |
| Every command in `.factory/claims.json` | PASS — 11 commands run separately |

The build produces 40,221 B of JavaScript and 22,212 B of CSS before gzip.
The mobile hero is 42,804 B. All are below the supplied budgets.

## Accessibility and browser checks

- Fresh Chromium scans found zero axe violations on `/`, `/demo`, `/write`,
  `/review`, `/pricing`, `/privacy/`, `/terms/`, `/404.html`, and
  `/offline.html` locally. Live scans found zero violations on every public
  route and the deliberate 404.
- Each route has one H1 and one main landmark. Route titles are distinct.
- The skip link is the first Tab stop and moves focus to main. Application
  navigation moves focus to the new H1. Back, reload, radio controls, and native
  dialogs were checked by browser tests.
- The 390 px layout has no horizontal overflow. At 200% text size it still has
  no horizontal overflow or hidden H1.
- Reduced motion removes transforms and reduces transition and animation time.
- Fresh phone and desktop screenshots are in `/work/.evidence/repair-2/`.

## PWA, privacy, and live checks

- The manifest parses without errors, declares standalone display, and provides
  working 192 px and 512 px icons. The live manifest has
  `application/manifest+json` content type.
- A dedicated fresh browser context loaded `/demo` online, became
  service-worker controlled, went offline, reloaded, and retained its cases.
- Normal sample use made same-origin requests only. Authoring sent no case field
  in any request and made no non-GET request.
- `verify-url.sh` passed live in 640 ms with no console or page errors.
- Live Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO
  100; FCP 0.9 s, LCP 1.2 s, CLS 0, TBT 0 ms, 66 KiB transferred.
- Root, demo, application, legal, asset, icon, manifest, worker, and 404 files
  checked live are byte-identical to the implementation build.
- Live response headers include CSP, HSTS, `nosniff`, strict-origin referrer
  policy, Permissions Policy, and anti-framing. Hashed assets use a one-year
  immutable cache policy; `sw.js` does not cache.

## Run and verify

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:claims
npm run preview
```

The exact per-claim commands and sandbox conditions are in
[`.factory/claims.json`](claims.json). Demo behavior and storage names are in
[`.factory/demo.md`](demo.md).

## Deployment

`/opt/fleet/lib/deploy-static.sh concept-case-bridge /work/repo/dist` completed
successfully against the existing `sf-concept-case-bridge` Static Web App in
`centralus`. The custom domain was Ready and HTTPS returned 200. No database,
container, shared service, staging slot, billing setting, or secret was read or
changed.

## Known gaps

No product defect remains from the supplied review history or this repair.
A real production purchase was not made. The paid outcome test uses a recorded
valid verification response, while the live production checkout was limited to
confirming its HTTP 303 redirect. This avoids an unnecessary charge and follows
the claims contract for paid integration tests.
