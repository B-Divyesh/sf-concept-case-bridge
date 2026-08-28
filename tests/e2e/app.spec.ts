import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function backupCase(id: string, title: string) {
  const timestamp = '2026-08-28T12:00:00.000Z';
  return {
    id, title, scenario: 'A specific business event needs a safe technical decision.', domainSignal: 'The event may retry but must take effect only once.', concept: 'Idempotency key', decision: 'Store a stable event ID with the outcome.', alternative: 'Request debounce', whyNotAlternative: 'A late retry can arrive outside the debounce window.', attribution: 'Generic test case; no employer data.', createdAt: timestamp, updatedAt: timestamp, nextReviewAt: timestamp, reviewCount: 0
  };
}

async function chooseBackup(page: import('@playwright/test').Page, backup: unknown) {
  await page.getByRole('button', { name: 'Import backup' }).click();
  await page.locator('#import-file').setInputFiles({ name: 'casebook.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
}

test('has no serious accessibility violations on the main and legal pages', async ({ page }) => {
  for (const path of ['/', '/privacy/', '/terms/']) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
    expect(blocking, `${path}: ${blocking.map((item) => `${item.id} (${item.nodes.length})`).join(', ')}`).toEqual([]);
  }
});

test('authors and reviews a concept-case link end to end', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByAltText(/technical diagrams and business evidence/)).toBeVisible();
  await page.getByRole('button', { name: 'Write a case', exact: true }).first().click();
  await page.getByLabel('Case title').fill('Duplicate shipment webhook');
  await page.getByLabel('Scenario').fill('A carrier retries the same delivered event after a timeout. Customer credit must only be issued once.');
  await page.getByLabel('Domain signal').fill('One delivery event can arrive more than once, but the credit is singular.');
  await page.getByLabel('Technical concept').fill('Idempotency key');
  await page.getByLabel('Decision').fill('Persist the carrier event ID with the credit transaction and ignore a processed ID.');
  await page.getByLabel('Tempting alternative').fill('Request debounce');
  await page.getByLabel('Why not the alternative?').fill('The retry can arrive after the debounce window and still duplicate the credit.');
  await page.getByRole('button', { name: 'Save case' }).click();
  await expect(page.getByRole('heading', { name: 'Duplicate shipment webhook' })).toBeVisible();
  await page.getByRole('button', { name: 'Practice' }).click();
  await page.getByLabel(/Idempotency key/).check();
  await page.getByRole('button', { name: 'Reveal decision' }).click();
  await expect(page.getByText('Intended concept chosen')).toBeVisible();
  await expect(page.getByText(/retry can arrive after the debounce window/i)).toBeVisible();
  await page.getByRole('button', { name: 'Record & next' }).click();
  await expect(page.getByText('Nothing is due right now.')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('supports a 390px empty state and keyboard entry', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Start with one decision/ })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow-x', 'visible');
});

test('reopens saved cases while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add a generic example' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory updates arrive twice' })).toBeVisible();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.getByText('Offline.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inventory updates arrive twice' })).toBeVisible();
});

test('shows transparent paid terms and restore path', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get unlimited' }).click();
  await expect(page.getByText('$19')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buy the one-time unlock' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/concept-case-bridge/checkout');
  await expect(page.getByLabel('License token')).toBeVisible();
});

test('rejects whitespace-only authoring fields instead of saving an empty case', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Write a case', exact: true }).first().click();
  await page.getByLabel('Case title').fill('Whitespace should not save');
  for (const label of ['Scenario', 'Domain signal', 'Technical concept', 'Decision', 'Tempting alternative', 'Why not the alternative?', 'Attribution / source']) {
    await page.getByLabel(label).fill('   ');
  }
  await page.getByRole('button', { name: 'Save case' }).click();
  await expect(page.getByRole('alert')).toContainText('meaningful text');
  await expect(page.getByRole('heading', { name: 'Whitespace should not save' })).toHaveCount(0);
});

test('rejects malformed imports before persistence and keeps the casebook usable after reload', async ({ page }) => {
  const card = backupCase('valid_case', 'Valid imported case');
  await page.goto('/');
  await chooseBackup(page, { format: 'concept-case-bridge', version: 1, exportedAt: card.createdAt, cases: [card], reviews: [{ id: 'bad_review', caseId: null, reviewedAt: 'not-a-date', selected: {}, correct: 'true' }] });
  await expect(page.getByText('A review is malformed. Nothing was imported.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Casebook unavailable')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Start with one decision/ })).toBeVisible();
});

test('recovers a legacy malformed review without asking the user to clear their casebook', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('concept-case-bridge');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const transaction = open.result.transaction('reviews', 'readwrite');
        transaction.objectStore('reviews').put({ id: 'legacy_bad_review', caseId: null, reviewedAt: 'not-a-date', selected: {}, correct: 'true' });
        transaction.oncomplete = () => { open.result.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  await expect(page.getByText(/Recovered this casebook by removing 1 malformed record/i)).toBeVisible();
  await expect(page.getByText('Casebook unavailable')).toHaveCount(0);
});

test('merge warns about case ID collisions and preserves the local case', async ({ page }) => {
  const original = backupCase('same_id', 'Original imported title');
  const replacement = backupCase('same_id', 'Replacement imported title');
  const makeBackup = (card: ReturnType<typeof backupCase>) => ({ format: 'concept-case-bridge', version: 1, exportedAt: card.createdAt, cases: [card], reviews: [] });
  await page.goto('/');
  await chooseBackup(page, makeBackup(original));
  await page.getByRole('button', { name: 'Replace this casebook' }).click();
  await expect(page.getByRole('heading', { name: original.title })).toBeVisible();
  await chooseBackup(page, makeBackup(replacement));
  await expect(page.getByText(/Merge keeps the local version and skips the imported duplicate/i)).toBeVisible();
  await page.getByRole('button', { name: 'Merge with this casebook' }).click();
  await expect(page.getByRole('heading', { name: original.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: replacement.title })).toHaveCount(0);
});

test('enforces the free 15-case ceiling during import', async ({ page }) => {
  const cases = Array.from({ length: 16 }, (_, index) => backupCase(`case_${index}`, `Imported case ${index + 1}`));
  await page.goto('/');
  await chooseBackup(page, { format: 'concept-case-bridge', version: 1, exportedAt: cases[0].createdAt, cases, reviews: [] });
  await expect(page.getByText(/free casebook holds 15/i)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('never persists a returned license token in service-worker caches', async ({ page, context }) => {
  await context.route('https://api.sociobot.in/**', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'invalid' }) }));
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.goto('/?license=sensitive-demo-token');
  await expect(page).toHaveURL(/\/$/);
  const cachedUrls = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()))).flat().map((request) => request.url);
  });
  expect(cachedUrls.join('\n')).not.toContain('sensitive-demo-token');
});

test('keeps footer links touch-sized and avoids a nested complementary landmark', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const link of await page.locator('footer nav a').all()) expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await page.getByRole('button', { name: 'Get unlimited' }).click();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.find((violation) => violation.id === 'landmark-complementary-is-top-level')).toBeUndefined();
});
