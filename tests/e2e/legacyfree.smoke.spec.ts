import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

test('legacy-free entry disables legacy runtime', async ({ page }) => {
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

  expect(mode.mode).toBe('legacy-free');
  expect(mode.legacyAutoInit).toBe(false);
  expect(mode.legacyExists).toBe(false);
  expect(mode.meModeAttr).toBe('legacy-free');
});
