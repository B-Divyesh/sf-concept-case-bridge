# Concept Case Bridge

Concept Case Bridge helps professionals practice technical choices in realistic
business cases. Write a scenario, name its domain signal, hide the decision, and
compare the intended concept with a plausible alternative.

Live product: <https://concept-case-bridge.sociobot.in>

Try the isolated sample: <https://concept-case-bridge.sociobot.in/demo>

## Who it is for

It is for professionals learning a technical stack and an unfamiliar business
domain at the same time. The product focuses on transfer decisions, not fact
recall or generated lessons.

## Verified behavior

- Cases and review records stay in IndexedDB and persist across reloads.
- The demo uses `demo:concept-case-bridge`, separate from the real casebook.
- Reviews hide the decision until a choice is made.
- JSON export includes cases, attribution, and review history.
- Import checks every case and review before changing stored data.
- The PWA reopens saved cases offline after one online visit.
- The free version accepts up to 15 cases.
- A verified $19 one-time license enables unlimited cases and recent history.
- Normal use loads no analytics, trackers, third-party fonts, or CDN scripts.
- Authoring a case does not upload its content.

Each statement above has one browser test in [`.factory/claims.json`](.factory/claims.json).
The sample contains three generic business cases. Do not put confidential,
personal, or regulated facts into a case.

## Run locally

Requirements: Node.js 20 or later and npm.

```sh
npm ci
npm run dev
```

Vite prints the local URL. The free product needs no environment variables.

## Test and build

```sh
npm run lint
npm test
npm run build
npm run preview
```

Run all public-claim checks with:

```sh
npm run test:claims
```

`npm test` runs unit and Chromium browser checks, including claims,
accessibility, keyboard use, mobile layout, and offline reload. `npm run build`
writes the static product to `dist/`.

Playwright is pinned to 1.58.2. If its browser bundle is absent, run
`npx playwright install chromium` once.

## Billing

The hosted checkout and license check use the Sociobot billing API. A staging
build can select its registered test product with:

```sh
VITE_BILLING_BASE=https://pilot-api.sociobot.in npm run build
```

The product does not include payment-provider code or credentials.

## Data and deployment

Deploy the files in `dist/` as one static site. The included Static Web Apps
configuration keeps hashed assets immutable, makes the service worker
revalidate, and serves the designed 404 document with HTTP 404.

See [the demo contract](.factory/demo.md), [visual thesis](.factory/design.md),
[privacy policy](public/privacy/index.html), and [terms](public/terms/index.html).

## License

MIT. See [LICENSE](LICENSE).
