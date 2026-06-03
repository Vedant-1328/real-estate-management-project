import { test, expect } from '@playwright/test';
import { EXTRA_ROUTES, NAV_PAGES } from './routes.js';

test.describe('Sidebar navigation', () => {
  for (const { path, heading } of NAV_PAGES) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, '\\/')}(\\?|$)`));
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
      await expect(page).not.toHaveURL(/\/login/);
    });
  }
});

test.describe('Direct routes', () => {
  test('redirects / to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('redirects /job-assignments to EOD entries', async ({ page }) => {
    await page.goto('/job-assignments');
    await expect(page).toHaveURL(/\/eod-entries/);
  });

  test('redirects /suppliers to companies', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page).toHaveURL(/\/companies/);
  });

  for (const { path, heading } of EXTRA_ROUTES) {
    test(`loads ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    });
  }
});

test.describe('Sidebar link clicks', () => {
  test('click through main sections from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    const clicks = [
      'Companies',
      'EOD Entries',
      'Invoices',
      'Payments',
      'Users',
    ];
    for (const label of clicks) {
      await page.getByRole('link', { name: label, exact: true }).click();
      await expect(page).not.toHaveURL(/\/login/);
      await page.waitForLoadState('networkidle');
    }
  });
});
