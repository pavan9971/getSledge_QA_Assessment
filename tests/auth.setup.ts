import fs from 'node:fs';
import { expect, test as setup } from '@playwright/test';
import { credentials, STORAGE_STATE } from '../config/env';

// Log in once and save the session so the other tests start already signed in.
// If login ever moves to SSO or a captcha, record the session by hand instead:
//   npx playwright codegen https://www.getsledge.com --save-storage=.auth/user.json
setup('sign in', async ({ page }) => {
  if (fs.existsSync(STORAGE_STATE) && !process.env.FORCE_LOGIN) return;

  const { email, password } = credentials();

  await page.goto('/sign-in');
  await page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).first().fill(email);

  // some versions of the form ask for the password on a second step
  const continueButton = page.getByRole('button', { name: /^continue$/i });
  if (await continueButton.isVisible().catch(() => false)) await continueButton.click();

  await page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i)).first().fill(password);
  await page.getByRole('button', { name: /sign in|log in|continue/i }).first().click();

  await page.waitForURL(/\/(home|company|projects)/, { timeout: 30_000 });
  await expect(page.getByRole('link', { name: /projects/i }).first()).toBeVisible();

  await page.context().storageState({ path: STORAGE_STATE });
});
