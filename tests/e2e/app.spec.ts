import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
