import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const timestamp = '2026-09-05T12:00:00.000Z';

function backupCase(id: string, title: string) {
  return {
    id,
    title,
    scenario: 'A billing event may arrive twice and must change the account only once.',
    domainSignal: 'One real event can be delivered more than once.',
    concept: 'Idempotency key',
    decision: 'Store the event ID with the account update.',
    alternative: 'Request debounce',
    whyNotAlternative: 'A later retry can arrive outside the debounce window.',
    attribution: 'Generic test case; no employer data.',
    createdAt: timestamp,
    updatedAt: timestamp,
    nextReviewAt: timestamp,
    reviewCount: 0
  };
}

function backupWith(count: number) {
  return {
    format: 'concept-case-bridge',
    version: 1,
    exportedAt: timestamp,
    cases: Array.from({ length: count }, (_, index) => backupCase(`claim_case_${index}`, `Claim case ${index + 1}`)),
    reviews: []
  };
}

async function chooseBackup(page: import('@playwright/test').Page, backup: unknown) {
  await page.getByRole('button', { name: 'Import backup' }).click();
  await page.locator('#import-file').setInputFiles({
    name: 'casebook.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });
}

async function writeMarkedCase(page: import('@playwright/test').Page, title: string) {
  await page.getByRole('button', { name: 'Write your own case' }).click();
  await page.getByLabel('Case title').fill(title);
  await page.getByLabel('Scenario').fill('A marked sample scenario must remain private and survive a reload.');
  await page.getByLabel('Domain signal').fill('The same event can arrive more than once.');
  await page.getByLabel('Technical concept').fill('Idempotency key');
  await page.getByLabel('Decision').fill('Store the event identifier with the result.');
  await page.getByLabel('Tempting alternative').fill('Request debounce');
  await page.getByLabel('Why not the alternative?').fill('A retry can arrive after the debounce window.');
  await page.getByRole('button', { name: 'Save case' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

test('@claim:demo-isolation keeps sample changes out of the real casebook', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('concept-case-bridge', 1);
      open.onupgradeneeded = () => {
        open.result.createObjectStore('cases', { keyPath: 'id' });
        const reviews = open.result.createObjectStore('reviews', { keyPath: 'id' });
        reviews.createIndex('caseId', 'caseId');
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction('cases', 'readwrite');
        tx.objectStore('cases').put({ ...JSON.parse(JSON.stringify({ id: 'real_private_case', title: 'My real private case', scenario: 'Private real scenario.', domainSignal: 'Private signal.', concept: 'Real concept', decision: 'Real decision.', alternative: 'Real alternative', whyNotAlternative: 'Real reason.', attribution: 'Private source.', createdAt: '2026-09-05T12:00:00.000Z', updatedAt: '2026-09-05T12:00:00.000Z', nextReviewAt: '2026-09-05T12:00:00.000Z', reviewCount: 0 })) });
        tx.oncomplete = () => { open.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.goto('/demo');
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My real private case' })).toHaveCount(0);
  await writeMarkedCase(page, 'Demo-only marked case');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'Demo-only marked case' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Start for real' }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'My real private case' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inventory updates arrive twice' })).toHaveCount(0);
});

test('@claim:core-review hides and then explains the sample decision', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Try the sample review' }).click();
  await expect(page.getByText('Give each scanner event a stable identifier')).toHaveCount(0);
  await page.getByLabel('Debounce incoming requests').check();
  await page.getByRole('button', { name: 'Reveal decision' }).click();
  await expect(page.getByText('Give each scanner event a stable identifier', { exact: false })).toBeVisible();
  await expect(page.getByText('A retry minutes later could still apply twice', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Record & next' }).click();
  await expect(page.getByText('Review recorded. This case returns tomorrow.')).toBeVisible();
});

test('@claim:local-storage persists an authored case in the isolated browser database', async ({ page }) => {
  await page.goto('/demo');
  await writeMarkedCase(page, 'Local persistence marker 7391');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Local persistence marker 7391' })).toBeVisible();
  const stored = await page.evaluate(async () => {
    const databases = (await indexedDB.databases()).map((item) => item.name);
    const records = await new Promise<{ cases: { title: string }[]; reviews: unknown[] }>((resolve, reject) => {
      const open = indexedDB.open('demo:concept-case-bridge');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const tx = open.result.transaction(['cases', 'reviews']);
        const cases = tx.objectStore('cases').getAll();
        const reviews = tx.objectStore('reviews').getAll();
        tx.oncomplete = () => { open.result.close(); resolve({ cases: cases.result, reviews: reviews.result }); };
        tx.onerror = () => reject(tx.error);
      };
    });
    return { databases, records };
  });
  expect(stored.databases).toContain('demo:concept-case-bridge');
  expect(stored.databases).not.toContain('concept-case-bridge');
  expect(stored.records.cases.some((card) => card.title === 'Local persistence marker 7391')).toBe(true);
  expect(stored.records.reviews).toHaveLength(1);
});

test('@claim:json-export downloads complete cases and review history', async ({ page }) => {
  await page.goto('/demo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const backup = JSON.parse(await readFile(path!, 'utf8')) as { cases: Record<string, unknown>[]; reviews: Record<string, unknown>[] };
  expect(backup.cases).toHaveLength(3);
  expect(backup.reviews).toHaveLength(1);
  for (const card of backup.cases) {
    expect(Object.keys(card).sort()).toEqual(['alternative', 'attribution', 'concept', 'createdAt', 'decision', 'domainSignal', 'id', 'nextReviewAt', 'reviewCount', 'scenario', 'title', 'updatedAt', 'whyNotAlternative'].sort());
    expect(Object.values(card).every((value) => value !== null && value !== '')).toBe(true);
  }
  expect(backup.reviews[0]).toMatchObject({ caseId: 'demo_billing_cancel', selected: 'Transactional outbox', correct: true });
});

test('@claim:validated-import rejects malformed data before changing cases', async ({ page }) => {
  await page.goto('/demo');
  const originalTitles = await page.locator('.case-row h3').allTextContents();
  const card = backupCase('malformed_import_case', 'This case must not appear');
  await chooseBackup(page, { format: 'concept-case-bridge', version: 1, exportedAt: timestamp, cases: [card], reviews: [{ id: 'bad', caseId: null, reviewedAt: 'bad-date', selected: {}, correct: 'true' }] });
  await expect(page.getByText('A review is malformed. Nothing was imported.')).toBeVisible();
  await page.reload();
  expect(await page.locator('.case-row h3').allTextContents()).toEqual(originalTitles);
  await expect(page.getByRole('heading', { name: 'This case must not appear' })).toHaveCount(0);
});

test('@claim:pwa-install provides a valid manifest, icons, and active worker', async ({ page }) => {
  await page.goto('/demo');
  const client = await page.context().newCDPSession(page);
  const manifest = await client.send('Page.getAppManifest');
  expect(manifest.errors).toEqual([]);
  expect(manifest.url).toContain('/manifest.webmanifest');
  const parsed = JSON.parse(manifest.data ?? '{}') as { display?: string; start_url?: string; icons?: { src: string; sizes: string }[] };
  expect(parsed.display).toBe('standalone');
  expect(parsed.start_url).toMatch(/^\/?\?v=/);
  expect(parsed.icons?.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
});

test('@claim:offline-reload reopens the demo in its own offline browser context', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: 'Inventory updates arrive twice' })).toBeVisible();
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText('Offline.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inventory updates arrive twice' })).toBeVisible();
  } finally {
    await context.close();
  }
});

test('@claim:free-case-limit rejects a valid 16-case replacement without a license', async ({ page }) => {
  await page.goto('/demo');
  await chooseBackup(page, backupWith(16));
  await expect(page.getByText(/free version stores 15/i)).toBeVisible();
  await page.reload();
  await expect(page.locator('.case-row')).toHaveCount(3);
});

test('@claim:paid-unlimited accepts 16 cases after a recorded valid license response', async ({ page, context }) => {
  await context.route('https://api.sociobot.in/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) }));
  await page.goto('/demo?license=recorded-valid-test-token');
  await expect(page.getByRole('button', { name: 'License active' })).toBeVisible();
  await page.getByRole('button', { name: 'License active' }).click();
  await expect(page.getByText('$19')).toBeVisible();
  await page.getByRole('button', { name: /Cases/ }).click();
  await chooseBackup(page, backupWith(16));
  await page.getByRole('button', { name: 'Replace this casebook' }).click();
  await expect(page.locator('.case-row')).toHaveCount(16);
  await page.getByRole('button', { name: 'Practice' }).first().click();
  await page.getByLabel('Idempotency key').check();
  await page.getByRole('button', { name: 'Reveal decision' }).click();
  await page.getByRole('button', { name: 'Record & next' }).click();
  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('heading', { name: 'Recent decision checks' })).toBeVisible();
  await expect(page.getByText('Chose the intended concept')).toBeVisible();
});

test('@claim:no-tracking-cdn keeps normal demo traffic on the product origin', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Try the sample review' }).click();
  await page.getByLabel('Idempotency key').check();
  await page.getByRole('button', { name: 'Reveal decision' }).click();
  await page.getByRole('button', { name: 'Record & next' }).click();
  expect(requests.length).toBeGreaterThan(0);
  expect([...new Set(requests.map((url) => new URL(url).origin))]).toEqual(['http://127.0.0.1:4173']);
});

test('@claim:no-case-upload sends no authored fields over the network', async ({ page }) => {
  const requests: { method: string; body: string | null; url: string }[] = [];
  page.on('request', (request) => requests.push({ method: request.method(), body: request.postData(), url: request.url() }));
  await page.goto('/demo');
  requests.length = 0;
  await writeMarkedCase(page, 'Never upload marker 5813');
  await page.waitForTimeout(200);
  expect(requests.filter((request) => request.method !== 'GET')).toEqual([]);
  expect(JSON.stringify(requests)).not.toContain('Never upload marker 5813');
});
