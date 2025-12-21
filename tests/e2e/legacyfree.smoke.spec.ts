import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

test('module entry loads without the legacy bundle', async ({ page }) => {
  await gotoApp(page);

  const mode = await page.evaluate(() => {
    const g = window.MovementEngineer || {};
    return {
      mode: g.bootstrapOptions?.__mode,
      legacyAutoInit: g.bootstrapOptions?.legacyAutoInit,
      legacyExists: Boolean(g.legacy),
      meModeAttr: document.documentElement.dataset.meMode
    };
  });

  expect(mode.mode).toBe('module');
  expect(mode.legacyAutoInit).toBe(undefined);
  expect(mode.legacyExists).toBe(false);
  expect(mode.meModeAttr).toBe('module');
});
