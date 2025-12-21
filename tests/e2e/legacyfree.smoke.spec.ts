import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

test('legacy-free entry loads without the legacy bundle', async ({ page }) => {
  await gotoApp(page);

  const mode = await page.evaluate(() => {
    const g = window.MovementEngineer || {};
    const bootstrapOptions = g.bootstrapOptions || {};
    return {
      hasLegacyProp: Object.prototype.hasOwnProperty.call(g, 'legacy'),
      hasLegacyAutoInit: Object.prototype.hasOwnProperty.call(bootstrapOptions, 'legacyAutoInit'),
      hasLegacyModeFlag: Object.prototype.hasOwnProperty.call(bootstrapOptions, '__mode'),
      meModeAttr: document.documentElement.dataset.meMode || null
    };
  });

  expect(mode.hasLegacyProp).toBe(false);
  expect(mode.hasLegacyAutoInit).toBe(false);
  expect(mode.hasLegacyModeFlag).toBe(false);
  expect(mode.meModeAttr).toBeNull();
});
