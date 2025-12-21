import type { Page } from '@playwright/test';

export async function gotoApp(page: Page) {
  const entry = process.env.ME_E2E_ENTRY || '/';
  await page.goto(entry, { waitUntil: 'domcontentloaded' });
}
