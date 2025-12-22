import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

test('entry loads without the legacy runtime surface', async ({ page }) => {
  await gotoApp(page);

  const info = await page.evaluate(() => {
    const g = window.MovementEngineer || {};
    return {
      hasLegacyProp: Object.prototype.hasOwnProperty.call(g, 'legacy'),
      hasLegacyAutoInit: Object.prototype.hasOwnProperty.call(g.bootstrapOptions || {}, 'legacyAutoInit'),
      hasLegacyFree: Object.prototype.hasOwnProperty.call(g.bootstrapOptions || {}, 'legacyFree'),
      hasLegacyModeFlag: Object.prototype.hasOwnProperty.call(g.bootstrapOptions || {}, '__mode'),
      meModeAttr: document.documentElement.dataset.meMode || null
    };
  });

  expect(info.hasLegacyProp).toBe(false);
  expect(info.hasLegacyAutoInit).toBe(false);
  expect(info.hasLegacyFree).toBe(false);
  expect(info.hasLegacyModeFlag).toBe(false);
  expect(info.meModeAttr).toBe(null);
});
