# Verification 3 — Practice technical choices in business cases

Verified on 2026-09-05.

## Verdict: PASS

**PASS — 0 findings and 0 untested public claims.** The reviewed implementation
is `df9afa52f7df33dead0426d2a83569407ed61ba8`. The later documentation commit
is `498d61406cf99c2650af343b0121eeed8bf017c0`; it does not change the product
runtime. The live site at <https://concept-case-bridge.sociobot.in> matches the
implementation build.

## Job, audience, and first action

The job is to help a person practise choosing the right technical concept in a
realistic business case. It is for professionals learning a technical stack and
an unfamiliar business domain together. Before scrolling, fresh desktop and
390 px phone browsers show the job heading, audience sentence, **Try it with
sample data**, its next-step explanation, and the three facts about local
storage, offline use, and price.

The one-click sample opens three realistic cases in a separate demo casebook.
The persistent label says “Demo — sample data, nothing is saved.” Reset restores
the sample, and Start for real returns to the untouched real casebook.

## Clean-checkout gates

Testing used a detached worktree at the implementation commit. No product
source was changed during verification.

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 141 packages installed; npm reported 0 vulnerabilities. |
| `npm run lint` | PASS | ESLint completed with no output. |
| `npm test` | PASS | 8 Vitest tests and 25 Chromium browser tests passed. |
| `npm run build` | PASS | Wrote `dist/` with `index.html` at its root. |
| Runtime budget | PASS | JS 40,221 B, CSS 22,212 B, mobile hero 42,804 B. |

## Public claims

All 11 declared commands were run separately from the clean implementation
worktree. Each command passed its one tagged Chromium test; there are no missing
or untested public claims.

| Claim | Result | Observable evidence |
| --- | --- | --- |
| `demo-isolation` | PASS | Demo changes and reset did not alter a seeded real casebook. |
| `core-review` | PASS | Choice precedes reveal; the decision and counterexample then appear. |
| `local-storage` | PASS | An authored demo case survived reload in `demo:concept-case-bridge`. |
| `json-export` | PASS | Backup contained complete cases, attribution, and review history. |
| `validated-import` | PASS | A malformed review was rejected before stored sample cases changed. |
| `pwa-install` | PASS | Chromium parsed the manifest, icons, and active worker. |
| `offline-reload` | PASS | A dedicated context reopened the sample offline after first load. |
| `free-case-limit` | PASS | An unlicensed 16-case replacement was rejected. |
| `paid-unlimited` | PASS | Recorded valid verification allowed 16 cases and recent history. |
| `no-tracking-cdn` | PASS | Normal demo traffic stayed on the product origin. |
| `no-case-upload` | PASS | Authoring made no non-GET request and sent no marked content. |

The exact commands and sandbox conditions remain in
[`.factory/claims.json`](claims.json).

## Live product checks

- Fresh desktop and phone browser contexts had no console or page errors. The
  390 px layout had `scrollWidth = innerWidth = 390` before the deliberate
  browser zoom experiment; the first screen was visually inspected in
  [`/work/.evidence/verify-3/`](../../.evidence/verify-3/).
- Live sample review hid its decision until a choice, showed why the alternative
  did not fit, recorded the result, reset to the three sample cases, and exited
  demo without its label remaining.
- A live private context seeded a real case, entered and reset demo, then
  returned to that real case unchanged. Whitespace-only required text produced
  the meaningful-text error.
- The first Tab stop was Skip to main content; Enter focused `<main>`. Reduced
  motion reduced transition and animation duration to `0.000001s`.
- Live axe scans found no violations on `/`, `/demo`, `/write`, `/review`,
  `/pricing`, `/privacy/`, `/terms/`, and `/404.html`. The required URL checker
  passed in 793 ms with title, `lang=en`, one H1, main landmark, image alt text,
  labelled buttons, and no console errors.
- Route titles, one-H1 structure, legal pages, internal links, manifest, icons,
  security headers, CSP, immutable hashed assets, and the hosted checkout link
  were checked live. Checkout returned HTTP 303 to the hosted payment page; no
  purchase was made.
- `/does-not-exist` deliberately returns HTTP 404 and presents its own title,
  H1, main landmark, and Return to your casebook link. Its 404 status is the
  expected designed missing-page outcome, not a defect.

## Offline and deployment identity

Live Chromium parsed `manifest.webmanifest` with zero errors, `display:
standalone`, `/?v=1.1.0` start URL, and 192 px and 512 px icons. After a first
online visit, the service worker controlled `/demo`; an offline reload showed
the Offline status and retained “Inventory updates arrive twice.”

All 20 publicly served runtime files in the implementation build matched live
byte-for-byte. This includes the root document, app assets, service worker,
manifest, offline and 404 documents, legal pages, icons, images, sitemap, and
robots file. `staticwebapp.config.json` is deployment configuration and is not
publicly served.

This is a static local-first PWA, not a backend, CLI, library, or desktop
artifact. Tenant isolation, server restart persistence, health endpoints, and
product-server rate-limit checks do not apply. The optional Sociobot billing
endpoint was checked only for its live checkout redirect.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Checkout returned 404 | Fixed: live configured checkout returned HTTP 303. |
| Malformed review could break the casebook | Fixed: malformed import rejection and legacy-record recovery tests passed. |
| Merge overwrote a same-ID local case | Fixed: the collision test preserves the local case. |
| Whitespace fields saved | Fixed: live and browser tests show a meaningful-text error. |
| Free 15-case limit could be bypassed by import | Fixed: the 16-case claim test rejects it. |
| License token reached worker cache | Fixed: the regression test passed. |
| Footer targets and landmark structure | Fixed: live axe has no violations and regression tests pass. |
| Static assets lacked immutable caching | Fixed: hashed live JS and CSS use one-year immutable caching. |
| One-click demo was not isolated | Fixed: live and claim tests prove separate demo storage and reset behavior. |
| Claims ledger was missing | Fixed: 11 claims have one tagged command each, all passed independently. |
| First screen was unclear | Fixed: live phone and desktop first screens state job, audience, action, next step, and facts. |
| Unknown routes rendered the app | Fixed: live unknown route is a designed HTTP 404. |

## Evidence and reproduction

Evidence is under `/work/.evidence/verify-3/`, including browser, flow, edge,
PWA, route/link, axe, and URL-check reports plus desktop and phone screenshots.

```sh
git worktree add --detach /tmp/ccb-verify df9afa5
cd /tmp/ccb-verify
npm ci
npm run lint
npm test
npm run build
npm run test:claims
```

No product defects or known gaps remain from this verification.
