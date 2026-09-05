# Demo sandbox

## Entry point

- Live: <https://concept-case-bridge.sociobot.in/demo>
- Local after `npm run dev`: `/demo`
- The landing-page action **Try it with sample data** opens this route in one click.

## Sample data

The demo starts with three authored cases:

1. A duplicate warehouse inventory update that needs an idempotency key.
2. A revised insurance estimate that needs optimistic concurrency control.
3. A cancellation during billing that needs a transactional outbox.

The third case includes one successful review. The other two are ready to
review. Every example is generic and contains no employer or customer data.

## Isolation and reset

Demo cases and reviews use the IndexedDB database
`demo:concept-case-bridge`. Demo license checks use localStorage keys prefixed
with `demo:`. The demo never opens the real `concept-case-bridge` database.

**Reset demo** replaces only the demo database with the three original cases
and removes demo license data. **Start for real** deletes the demo database and
demo license data before opening `/`. A new demo session also starts from the
original sample.

The demo works offline after one online visit. Automated claim tests always use
a fresh browser context and the `/demo` entry point.
