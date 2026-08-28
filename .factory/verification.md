# Independent product verification — FAIL

Verified on **2026-08-28** against candidate
`90b7c506174a8b8b7cf6ce59c123730d187938f1` and
<https://concept-case-bridge.sociobot.in/>.

## Verdict

**FAIL.** The deployed free author/review/offline loop works and the live static
artifacts match the candidate, but the advertised paid checkout is unavailable
and import can overwrite local work or persist malformed data that makes an
unlocked casebook unusable. These are release-blocking failures of the billing,
data-integrity, and recovery contracts.

## Defects

### Major

1. **The production purchase path is unavailable.**
   `GET https://api.sociobot.in/api/v1/products/concept-case-bridge/checkout`
   returned HTTP **404** with
   `{"error":"enabled factory product","status":404}` on 2026-08-28. The
   in-product “Buy the one-time unlock” link points exactly there, so a user
   cannot buy the advertised $19 unlock. The related invalid-license verification
   endpoint did work (`200`, `{valid:false, reason:"invalid"}`) and returned the
   correct production CORS origin.

2. **A malformed imported review can persistently break an unlocked app.**
   An otherwise valid v1 backup whose review contained `id: 3`, `caseId: null`,
   `reviewedAt: "not-a-date"`, an object `selected`, and string `correct` was
   accepted as “validated.” Choosing Replace wrote it to IndexedDB. Rendering
   then raised `RangeError: Invalid time value`; after reload the app showed
   “Casebook unavailable / Invalid time value / Try again.” Reload cannot recover
   because the malformed record remains. Clearing site data is the practical
   recovery, which also risks destroying the user's local casebook. Import
   validation checks case text fields but does not validate review records,
   timestamps, counters, or related types.

3. **Merge silently overwrites an existing local case on an ID collision.**
   Importing a valid case with ID `same_id`, then merging a second valid backup
   with ID `same_id` and a different title, replaced “Original imported title”
   with “Replacement imported title.” No collision warning or conflict choice was
   shown. This contradicts both the UI promise that merge keeps existing cases
   and the design contract that import never silently overwrites local work.

### Moderate

4. **Required case fields accept whitespace-only input.** A normal title plus
   three spaces in every other required field passes native validation. The app
   trims those fields to empty strings, stores the invalid case, and reports
   “Case saved.” Empty scenario, signal, concept, decision, alternative,
   explanation, and attribution were confirmed in IndexedDB. A genuinely empty
   title is correctly rejected, and a 91-character title is correctly constrained
   to the 90-character maximum.

5. **The paid 15-case ceiling is bypassed through Import.** Creating a 16th case
   is correctly blocked when 15 exist, but Replace import accepted and exposed
   all 16 cases to an unlicensed user. This makes the advertised unlimited-case
   unlock unenforced through a normal product feature.

6. **A returned license token is retained in the service-worker cache key.** On
   a service-worker-controlled client, visiting `/?license=sensitive-demo-token`
   strips the query from the visible URL and stores the token in localStorage as
   intended, but Cache Storage also contains the full request URL
   `https://concept-case-bridge.sociobot.in/?license=sensitive-demo-token`.
   The privacy page says the license is stored in localStorage and does not
   disclose this additional persistent copy. Navigation responses containing a
   `license` query should not be cached under the sensitive URL.

### Minor

7. **Some mobile targets are below the 44 px interaction target.** At 390 px the
   Privacy, Terms, and Source footer links measured 19 px high without a padded
   hit area. Radio inputs themselves are 20 px but are correctly wrapped by
   62 px-high clickable labels. Axe also reports one moderate rule on the paid
   view: `landmark-complementary-is-top-level` for the restore `<aside>`.

8. **Deployment caching does not meet the stated immutable-asset policy.** The
   JS and CSS have stable names (`app.js`, `app.css`) rather than content hashes,
   and all checked live resources use `cache-control: public, must-revalidate,
   max-age=30`; none use long-lived immutable caching. Conditional requests do
   return `304`. This is not a current budget failure, but it misses the supplied
   performance/caching contract.

## Clean-checkout gates

The candidate was checked out detached into `/tmp/ccb-verify-THxnoW` from the
clean repository state before dependencies were installed.

| Gate | Result | Evidence |
| --- | --- | --- |
| Candidate identity | PASS | clean source HEAD and `origin/main` were the requested SHA before report edits |
| `npm ci` | PASS | 60 packages installed; npm reported 0 vulnerabilities |
| `npm test` | PASS | 6/6 Vitest tests and 5/5 Playwright tests passed |
| Type check | PASS | `tsc --noEmit` runs in the production build |
| Lint | N/A | no lint script or lint configuration is present |
| `npm run build` | PASS | Vite 7.3.6 produced `dist/` |
| Build budget | PASS | JS 30,178 B (10.01 KB gzip); CSS 19,704 B (5.25 KB gzip) |
| Media budget | PASS | desktop WebP 139,946 B; 390 px WebP 42,804 B |

The repository is a PWA, not a library, CLI, or backend, so consumer-package,
CLI, concurrency, server persistence, and health/build-identity checks are not
applicable.

## Live deployment identity and policies

- Root HTML, JS, CSS, service worker, manifest, offline page, Privacy, Terms,
  both WebP images, and both PNG icons all matched the clean build byte-for-byte
  by SHA-256. The live deployment therefore matches the candidate for every
  shipped runtime artifact checked.
- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title present, `lang="en"`,
  one `<h1>`, `<main>`, no missing image alt, no unlabeled button, no console or
  page error; measured load was 875 ms.
- Fresh initial load requested only the origin document, app JS, app CSS, and
  hero image. There were no analytics, third-party fonts/scripts, outbound
  requests, failed requests, console errors, or page errors. The only optional
  outbound origin observed during license handling was the contractual
  `https://api.sociobot.in`.
- Responses include HSTS, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy: strict-origin-when-cross-origin`. They do not include CSP,
  Permissions-Policy, anti-framing (`frame-ancestors`/`X-Frame-Options`), COOP,
  or CORP. This is recorded as defense-in-depth rather than a verdict driver.
- The manifest is served as `application/octet-stream`, but Chromium parsed it
  with zero manifest errors. Declared 192 and 512 icons have the stated sizes.

## Product and edge-case exercise

### Passing behavior

- Authored a representative refund-webhook case with scenario, domain signal,
  idempotency concept, decision, plausible debounce alternative, explanation,
  and attribution. It persisted through reload.
- Review hid the decision until a choice was committed. Choosing the wrong
  alternative showed the intended concept and “why not” explanation; recording
  it scheduled the next check and reached the clear-state screen.
- JSON export contained the complete case, attribution, and review. Broken JSON
  was rejected with an error and preserved existing work.
- Delete dialog named the case, placed focus inside, Escape preserved the
  case and returned focus, and explicit confirmation removed the case and review
  history.
- License return capture stored the token, stripped it from the visible URL,
  verified once, unlocked from a valid result, and made no second verification
  request within the daily cache window.
- Empty, due, clear, wrong-answer, offline, and destructive-confirmation states
  were exercised. Storage failure copy and fatal-state rendering were inspected;
  the malformed-import defect above demonstrates the fatal path.

### PWA and offline

- Live Chromium reported a parsed manifest, an activated controlling service
  worker, and no manifest errors.
- After adding a case and allowing service-worker activation, browser offline
  mode plus reload showed the Offline banner and the saved IndexedDB case.
- A local update simulation served a byte-changed worker/cache version. The app
  displayed “A fresh workbench is ready,” the replacement worker activated, the
  old cache was removed, Reload completed, and no page error occurred.

### Accessibility, mobile, and motion

- Existing axe coverage passed on `/`, `/privacy/`, and `/terms/`. Independent
  scans of the editor and revealed answer also found 0 serious/critical issues;
  the paid view found 0 serious/critical and the one moderate landmark issue
  listed above.
- At 390×844 there was no horizontal overflow (`scrollWidth = innerWidth = 390`).
  The skip link was first in keyboard order, had a visible 3 px teal outline,
  Enter focused main, native radio controls worked by keyboard, and dialog focus
  returned to the triggering Delete button on Escape.
- With `prefers-reduced-motion: reduce`, transforms were removed, computed
  animation duration was effectively zero, and smooth scrolling was disabled.
- Screens were visually inspected at 1440×1100 and 390×844 for empty, library,
  and review states. Content remained legible and usable with no clipping.

## Performance evidence

Lighthouse 12.8.2 against the live production URL using mobile emulation:

- Performance **96**, Accessibility **100**, Best Practices **100**, SEO **100**
- FCP **0.9 s**, LCP **1.2 s**, CLS **0**, TBT **210 ms**, Speed Index **0.9 s**
- transferred byte-weight **62 KiB**

A local production-preview run scored 100/100/100/100 with LCP 1.7 s, CLS 0,
and TBT 60 ms. Lighthouse does not produce a field INP for this synthetic load;
no interaction stall was observed in the browser exercises.

## Reproduction commands

```sh
git worktree add --detach /tmp/ccb-verify <candidate-sha>
cd /tmp/ccb-verify
npm ci
npm test
npm run build
/opt/fleet/lib/verify-url.sh https://concept-case-bridge.sociobot.in /tmp/ccb-url-evidence
```

Release should remain blocked until the checkout product is enabled and the
three data-integrity paths (review validation, merge collision handling, and
whitespace validation) are corrected and regression-tested. The license-query
cache leak should be fixed before accepting payments.
