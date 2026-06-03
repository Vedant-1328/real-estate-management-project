import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test('shows validation for empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('rejects invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('admin@supplier.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('successful login reaches dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('admin@supplier.com');
    await page.getByLabel('Password').fill('Admin@123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });

  test('demo credentials hint is not shown', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Demo:/i)).toHaveCount(0);
  });
});
