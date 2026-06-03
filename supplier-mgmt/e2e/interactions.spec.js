import { test, expect } from '@playwright/test';

test.describe('Key UI actions', () => {
  test('logout returns to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('EOD: open and close afternoon entry modal', async ({ page }) => {
    await page.goto('/eod-entries');
    await page.getByRole('button', { name: /Afternoon EOD Entry/i }).first().click();
    await expect(page.getByRole('heading', { name: /Afternoon EOD Entry/i })).toBeVisible();
    await expect(page.getByText(/WHEN, WHAT & FOR/i)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Afternoon EOD Entry/i })).toBeHidden();
  });

  test('Invoices: navigate to generate invoice', async ({ page }) => {
    await page.goto('/invoices');
    await page.getByRole('button', { name: 'Generate Invoice' }).click();
    await expect(page).toHaveURL(/\/invoices\/generate/);
    await expect(page.getByRole('heading', { name: /Generate Invoice/i })).toBeVisible();
    await expect(page.getByText(/Continue — load EOD entries/i)).toBeVisible();
  });

  test('Generate invoice: optional period fields visible', async ({ page }) => {
    await page.goto('/invoices/generate');
    await expect(page.getByText('Period from')).toBeVisible();
    await expect(page.getByText('Period to')).toBeVisible();
    await expect(page.getByText(/optional/i).first()).toBeVisible();
  });

  test('Companies: own and customer sections', async ({ page }) => {
    await page.goto('/companies');
    await expect(page.getByText('Own Companies', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Customer Companies', { exact: false }).first()).toBeVisible();
  });

  test('Sites: master and temporary tabs', async ({ page }) => {
    await page.goto('/sites');
    await page.getByRole('button', { name: /Master Sites/i }).click();
    await expect(page.getByRole('button', { name: 'Add Site' })).toBeVisible();
    await page.getByRole('button', { name: /Temporary Sites/i }).click();
  });

  test('Roles: open permissions editor when roles exist', async ({ page }) => {
    await page.goto('/roles');
    const editLink = page.getByRole('link', { name: 'Edit Permissions' }).first();
    if (await editLink.isVisible().catch(() => false)) {
      await editLink.click();
      await expect(page).toHaveURL(/\/roles\/\d+\/permissions/);
      await expect(page.getByRole('heading', { name: /Permissions/i })).toBeVisible();
    }
  });

  test('Reports: run daily job report', async ({ page }) => {
    await page.goto('/reports/daily-job');
    await page.getByRole('button', { name: 'Generate' }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
