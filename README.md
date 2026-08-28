# Concept Case Bridge

Concept Case Bridge is a private, offline-capable case-card workbench for
professionals learning a technical stack and an unfamiliar business domain at
the same time. Its atomic unit is not a fact: it is a domain signal, a technical
choice, a decision, and a reason the closest alternative does not fit.

Live product: <https://concept-case-bridge.sociobot.in>

## What it does

- Authors compact cases with explicit concept, signal, decision, counterexample,
  and attribution fields.
- Hides the decision during review and schedules the next local check according
  to the result.
- Stores cases and review records in IndexedDB—there is no account or cloud sync.
- Exports and validates complete JSON backups; imports can merge or replace only
  after explicit confirmation.
- Installs as a PWA and reopens saved work offline.
- Provides 15 cases free. A $19 one-time Sociobot license enables unlimited cases
  and the recent review-history view. Review, accessibility, and export stay free.

The included example is deliberately generic. Do not put employer-confidential,
personal, or regulated facts into cases.

## Run locally

Requirements: Node.js 20+ and npm.

```sh
npm ci
npm run dev
```

Vite prints the local URL. No environment variables are required for the free
experience.

## Test and build

```sh
npm test
npm run lint
npm run build
npm run preview
```

`npm test` runs Vitest domain tests and Playwright Chromium flows, including a
service-worker offline reload and serious/critical axe scan. The exact production
build command is `npm run build`; it writes the static deploy to `dist/`, with
`dist/index.html` at its root.

Playwright is pinned to 1.58.2. In an environment without its browser bundle, run
`npx playwright install chromium` once.

## Billing configuration

The default hosted checkout and verify endpoint is the production Sociobot API.
For a registered staging product, build with:

```sh
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

No product ID or payment-provider code is embedded. The slug-based product must be
registered by the factory, and the checkout price should match the displayed $19
one-time price.

## Data and deployment

The site makes no analytics or font/CDN requests. The only optional third-party
runtime request is license checkout/verification initiated by a purchaser. Static
files in `dist/` can be deployed as-is. The included Azure Static Web Apps
configuration assigns immutable caching to hashed assets and no-cache revalidation
to `sw.js` so PWA updates are discovered promptly.

See [the visual thesis](.factory/design.md), [privacy policy](public/privacy/index.html),
and [terms](public/terms/index.html).

## License

MIT. See [LICENSE](LICENSE).
