import { test as setup } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authFile = path.join('e2e', '.auth', 'admin.json');

setup('authenticate as Super Admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('admin@supplier.com');
  await page.getByLabel('Password').fill('Admin@123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await page.getByRole('heading', { name: /Dashboard/i }).waitFor({ state: 'visible' });

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
