# Review 1 — Practice technical decisions in business cases

Reviewed on **2026-09-05**.

- Live URL: <https://concept-case-bridge.sociobot.in>
- Implementation candidate: `7555a9ec7f0880db1dcdc26e9c163e0967fd0373`
- Documentation tip: `322d73849dc0c851c31a885dfc7d4ef5c5d0198f`

## Verdict: FAIL

**FAIL — 4 findings and 9 untested public claims.** The local case authoring
and review flow works, but the required one-click isolated demo does not exist,
the required claims ledger is absent, the first screen does not state the job
and audience in plain words, and the site has no real 404 page. A successful
build and passing test suite do not make this a PASS because the acceptance
contract requires zero findings and zero untested claims.

## Job, audience, and first action

The job is to help professionals practise choosing a technical concept from a
realistic business case. It is for people learning a technical stack and an
unfamiliar business domain together. The first visible action before scrolling
is **Write a case**; it opens a blank editor. The sample action is only below
the first screen and is labelled **Add a generic example**.

Fresh desktop (1440 x 1000) and phone (390 x 844) browser contexts loaded the
same empty first screen without console or page errors. Evidence screenshots:
`/work/.evidence/desktop-landing.png`, `/work/.evidence/phone-landing.png`,
and `/work/.evidence/desktop-sample.png`.

## Findings

### Major — No isolated, one-click demo exists

The required `/demo` entry point returns HTTP 200 but opens the normal empty
casebook, not a sample sandbox. It has no persistent “Demo — sample data,
nothing is saved” label, no Reset demo, and no Start for real control. On both
fresh desktop and phone contexts, clicking **Add a generic example** changed
the normal `concept-case-bridge` IndexedDB case count from 0 to 1. It displayed
the realistic “Inventory updates arrive twice” card but wrote it as real local
data. The product therefore has neither the required first-screen sample action
nor a separate `demo:` storage namespace.

### Major — `.factory/claims.json` is absent; public claims are not proven in the required sandbox

The repository has no `.factory/claims.json`, so no public promise has the
required single `@claim:<id>` command or a demo-only observable assertion.
This leaves nine identifiable public promises untested in the mandated form:
local-only case storage; complete JSON export; validation before import changes;
PWA installation; offline reopening; the 15-case free limit; the $19 unlimited
unlock; no analytics/CDN requests; and no upload of authored cases. Existing
unit and browser tests exercise parts of several promises, but they are not
listed as claim tests and cannot run from the missing demo entry point. This is
**9 untested claims**.

### Moderate — The first screen does not use the required plain job statement

The sole H1 is the product name, “Concept Case Bridge,” rather than the job.
The prominent heading says “Don’t just know the concept. Recognize when it
belongs.” It does not name the intended professionals or plainly say that the
tool has them choose a technical concept in a business case. The next sentence
also does not say what happens after the primary action. The audience is absent
from the first screen, and the one-click sample is below it. Privacy, price, and
offline facts are not presented as the required three plain facts.

The same mood-style wording appears in headings such as “Privacy stays on your
side” and “Terms for a useful workbench,” contrary to the plain-words and
site-structure contracts.

### Moderate — Missing required 404 page

`GET /does-not-exist` returned HTTP 200 and rendered the normal application
with the normal title and H1. `staticwebapp.config.json` has a navigation
fallback but no 404 response override or designed 404 resource. This is not a
deliberate HTTP 404 and gives a visitor no missing-page explanation or way back.

## Checks that passed

### Clean checkout and build

A fresh network clone at documentation tip `322d738` was installed and tested
in `/tmp/concept-case-bridge-review-BVv79f`:

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 141 packages, 0 vulnerabilities |
| `npm run lint` | PASS |
| `npm test` | PASS — 8 Vitest and 12 Playwright tests |
| `npm run build` | PASS — writes `dist/` |

The documentation tip differs from the implementation candidate only in
`.factory/handoff.md` and `.factory/verification-2.md`. The clean build's
runtime files all SHA-256 matched live: HTML, hashed JS/CSS, worker, manifest,
offline page, legal pages/CSS, images/icons, robots, and sitemap.

### Live browser, accessibility, privacy, and PWA smoke checks

- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang=en`, one H1,
  main landmark, image alt text, labelled buttons, and no console/page errors
  (859 ms browser load).
- Live `@axe-core/playwright` scans of `/`, `/privacy/`, and `/terms/` reported
  no violations. The requested `@axe-core/cli` invocation could not find a
  Chrome binary in this worker; the Playwright axe integration uses the
  preinstalled browser and is the permitted equivalent.
- At 390 px, the skip link was the first Tab stop, Enter focused `main`, there
  was no horizontal overflow, and reduced motion set animation to `0.000001s`
  with normal scrolling.
- In a fresh live context, a saved generic card remained visible after a
  service-worker-controlled offline reload; the Offline banner appeared and no
  console error occurred. Initial-load requests were same-origin only.
- Privacy and Terms routes have distinct correct titles and rendered normally.
  Checkout was checked only for availability: its configured product endpoint
  returned HTTP 303 to hosted checkout. No purchase or valid license was used.
- Live hashed assets are served with `Cache-Control: public, max-age=31536000,
  immutable`; the service-worker source matches the candidate's license-query
  cache protection.

## Earlier findings and their current disposition

| Earlier finding | Current disposition |
| --- | --- |
| Checkout returned 404 | Fixed: the configured checkout endpoint returned HTTP 303. |
| Malformed review could break the casebook | Fixed in candidate tests: malformed import rejection and legacy-record recovery pass. |
| Merge overwrote same-ID local case | Fixed in candidate test: collision warning and local preservation pass. |
| Whitespace fields saved | Fixed in candidate test: meaningful-text validation passes. |
| Free 15-case limit bypassed by import | Fixed in candidate test: a 16-case import is rejected. |
| License token in worker cache | Fixed in candidate test; matching worker excludes `license` navigation requests from cache. |
| Small footer targets / nested landmark | Fixed in candidate test and live axe scan. |
| Non-immutable static caching | Fixed: live hashed JS has one-year immutable caching. |

The preceding candidate tests are applicable to live because every checked
runtime artifact byte-matched the clean build. The present demo, claims,
plain-words, and 404 findings are new acceptance checks not covered by the
earlier reports.

## Scope notes

This is a static local-first PWA, not a backend, CLI, library, or desktop app.
Tenant isolation, restart persistence, health endpoints, and 429/Retry-After
backend checks therefore do not apply. No code was changed for this review.

## Required next steps

1. Implement `/demo` (or `?demo=1`) with a first-screen “Try it with sample
   data” action, separate demo storage, persistent label, Reset demo, and Start
   for real controls.
2. Add `.factory/claims.json` and one dedicated demo-sandbox test for every
   public claim; remove claims that cannot be tested.
3. Rewrite first-screen and legal-page headings in plain words; make the H1 the
   job, name the audience, explain the first action, and show privacy/offline/
   price facts.
4. Add a designed HTTP 404 route and matching Static Web Apps response override.
