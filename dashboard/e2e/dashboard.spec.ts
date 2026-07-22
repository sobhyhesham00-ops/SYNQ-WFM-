import { test, expect } from '@playwright/test';
import { stubApi, seedSession, drivers, orders } from './fixtures';

test.describe('authentication gate', () => {
  test('shows the login screen when no token is stored', async ({ page }) => {
    await stubApi(page);
    await page.addInitScript(() => localStorage.setItem('meshwar_lang', 'en'));
    await page.goto('/');

    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('logging in swaps the login screen for the dashboard', async ({ page }) => {
    await stubApi(page);
    await page.addInitScript(() => localStorage.setItem('meshwar_lang', 'en'));
    await page.route('**/api/auth/manager/login', (route) =>
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ token: 'jwt', name: 'Sara', refreshToken: 'rt' }),
      }),
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Hero card from the authenticated dashboard.
    await expect(page.getByText('CASH TO COLLECT FROM FLEET')).toBeVisible();
  });

  test('language toggle switches the document to RTL Arabic', async ({ page }) => {
    await stubApi(page);
    await page.addInitScript(() => localStorage.setItem('meshwar_lang', 'en'));
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await page.getByRole('button', { name: 'العربية' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});

test.describe('authenticated dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await stubApi(page);
  });

  test('renders fleet, drivers and orders from /api/state', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('CASH TO COLLECT FROM FLEET')).toBeVisible();
    // Both seeded drivers show up in the cash-drawer list (the .name card
    // element, not the assign dropdown where names also appear).
    await expect(page.locator('.name', { hasText: drivers[0].name })).toBeVisible();
    await expect(page.locator('.name', { hasText: drivers[1].name })).toBeVisible();
    // Seeded orders render.
    await expect(page.getByText(orders[0].customerAddress)).toBeVisible();
    await expect(page.getByText(orders[1].customerAddress)).toBeVisible();
  });

  test('creating an order posts to /api/orders with the entered values', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('CASH TO COLLECT FROM FLEET')).toBeVisible();

    const [request] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/orders') && r.method() === 'POST'),
      (async () => {
        await page.getByPlaceholder('Customer address').fill('9 Talaat Harb St');
        await page.getByPlaceholder('EGP').fill('120');
        await page.getByRole('button', { name: '+', exact: true }).click();
      })(),
    ]);

    const body = request.postDataJSON();
    expect(body.customerAddress).toBe('9 Talaat Harb St');
    expect(body.totalCashEGP).toBe(120);
  });

  test('assigning a pending order posts to the assign endpoint', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(orders[0].customerAddress)).toBeVisible();

    // The pending order exposes an "Assign to…" select; pick the first driver.
    const select = page.locator('select.select').first();
    const [request] = await Promise.all([
      page.waitForRequest((r) => /\/api\/orders\/.+\/assign/.test(r.url()) && r.method() === 'POST'),
      select.selectOption(drivers[1].id),
    ]);
    expect(request.postDataJSON().driverId).toBe(drivers[1].id);
  });

  test('shows the onboarding checklist when there are no drivers yet', async ({ page }) => {
    // Override with an empty business (no drivers, no orders).
    await stubApi(page, { drivers: [], orders: [] });
    await page.goto('/');

    await expect(page.getByText('Add your first driver')).toBeVisible();
  });
});
