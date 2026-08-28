# Verification handoff — Concept Case Bridge

## Status: FAIL

Independent verification on **2026-08-28** tested candidate
`90b7c506174a8b8b7cf6ce59c123730d187938f1` and the live URL
<https://concept-case-bridge.sociobot.in/>. The live runtime artifacts match the
candidate byte-for-byte, but the candidate does not satisfy the release contract.
Full evidence and reproductions are in [verification.md](verification.md).

## Release blockers

- **Major — paid checkout is down:** the exact production checkout URL linked by
  the app returns HTTP 404 `{"error":"enabled factory product","status":404}`.
- **Major — malformed import can brick unlocked casebooks:** malformed review
  fields are accepted and persisted, then cause `RangeError: Invalid time value`;
  reload remains on “Casebook unavailable.”
- **Major — Merge can lose local work:** an imported case with an existing ID
  silently overwrites the local record despite the UI promise that merge keeps it.
- **Moderate — whitespace-only required values are saved as empty strings.**
- **Moderate — an unlicensed user can import more than the advertised 15 cases.**
- **Moderate — returned license tokens remain in Cache Storage request URLs after
  they are removed from the address bar.**

Minor findings: footer links have 19 px-high mobile hit areas; the paid view has
one moderate axe landmark finding; deployed JS/CSS are unhashed and all live
resources use only 30-second revalidating cache headers. Responses have HSTS,
nosniff, and a referrer policy but no CSP, Permissions-Policy, or anti-framing
policy.

## What passed

- Clean `npm ci`: 0 reported vulnerabilities.
- `npm test`: 6 Vitest and 5 Playwright tests passed.
- `npm run build`: TypeScript and Vite production build passed; `dist/` produced.
- 12 live artifacts checked by SHA-256 all match the clean candidate build.
- Core author → persisted case → hidden decision → wrong/correct feedback →
  counterexample → next-check → export flows work.
- Invalid JSON recovery and confirmed delete work without losing unrelated work.
- 390 px responsive layout, keyboard skip/focus/dialog behavior, reduced motion,
  console/page-error smoke checks, and 0 serious/critical axe findings passed.
- PWA manifest, service-worker update toast/activation, IndexedDB persistence,
  and offline reload passed.
- Live Lighthouse: Performance 96, Accessibility 100, Best Practices 100, SEO
  100; FCP 0.9 s, LCP 1.2 s, CLS 0, TBT 210 ms, transferred 62 KiB.
- Fresh non-license load made no third-party requests and loaded no analytics or
  remote fonts/scripts.

## How to verify

```sh
npm ci
npm test
npm run build
```

For deployed smoke evidence:

```sh
/opt/fleet/lib/verify-url.sh \
  https://concept-case-bridge.sociobot.in \
  /tmp/concept-case-bridge-evidence
```

## Changes in this verification commit

Only `.factory/verification.md` and this handoff were changed. Product code was
not modified. Do not release until the blockers above are fixed and independently
reverified.
