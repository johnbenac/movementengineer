import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

test('ESM entry loads without any legacy bundle', async ({ page }) => {
  await gotoApp(page);

  const mode = await page.evaluate(() => {
    const g = window.MovementEngineer || {};
    return {
      moduleMode: g.bootstrapOptions?.moduleMode,
      legacyExists: Boolean(g.legacy),
      meModeAttr: document.documentElement.dataset.meMode
    };
  });

  expect(mode.moduleMode).toBe('esm-only');
  expect(mode.legacyExists).toBe(false);
  expect(mode.meModeAttr).toBe('esm-only');
});
