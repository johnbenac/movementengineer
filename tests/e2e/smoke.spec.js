import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

test('entry loads with no legacy runtime surface', async ({ page }) => {
  await gotoApp(page);

  const info = await page.evaluate(() => {
    const g = window.MovementEngineer || {};
    const opts = g.bootstrapOptions || {};
    return {
      hasLegacyProp: Object.prototype.hasOwnProperty.call(g, 'legacy'),
      hasLegacyAutoInit: Object.prototype.hasOwnProperty.call(opts, 'legacyAutoInit'),
      hasLegacyFree: Object.prototype.hasOwnProperty.call(opts, 'legacyFree'),
      hasLegacyModeFlag: Object.prototype.hasOwnProperty.call(opts, '__mode'),
      meModeAttr: document.documentElement.dataset.meMode || null
    };
  });

  expect(info.hasLegacyProp).toBe(false);
  expect(info.hasLegacyAutoInit).toBe(false);
  expect(info.hasLegacyFree).toBe(false);
  expect(info.hasLegacyModeFlag).toBe(false);
  expect(info.meModeAttr).toBe('module');
});

test('import -> collections chip click routes via canonical router', async ({ page }) => {
  await page.addInitScript(() => {
    const stub = {
      parseGitHubRepoUrl: () => true,
      importMovementRepo: async () => ({
        specVersion: '2.3',
        movements: [{ id: 'm1', name: 'Movement One' }],
        textCollections: [
          { id: 'tc1', movementId: 'm1', name: 'Library', rootTextIds: ['txt-root'] }
        ],
        texts: [
          {
            id: 'txt-root',
            movementId: 'm1',
            title: 'Root Text',
            linkedTextIds: ['txt-chapter']
          },
          {
            id: 'txt-chapter',
            movementId: 'm1',
            title: 'Chapter 1',
            parentId: 'txt-root'
          }
        ]
      }),
      renderMarkdownForRecord: (_snapshot, _collection, record) =>
        record?.title || record?.name || record?.id || ''
    };
    Object.defineProperty(window, 'MarkdownDatasetLoader', {
      configurable: true,
      get: () => stub,
      set: () => {}
    });
  });

  await gotoApp(page);

  await page.click('#btn-import-from-github');
  await page.fill('#github-import-url', 'https://github.com/example/repo');
  await page.dispatchEvent('#github-import-form', 'submit');

  await page.waitForFunction(
    () => window.MovementEngineer?.ctx?.getState?.().snapshot?.movements?.length > 0
  );

  await page.click('[data-tab="collections"]');
  await page.selectOption('#collection-select', 'texts');

  const rootItem = page.locator('#collection-items li', { hasText: 'Root Text' });
  await rootItem.click();

  const chip = page.locator('#item-preview-body .chip', { hasText: 'Chapter 1' });
  await chip.click();

  await page.waitForFunction(() => {
    const ctx = window.MovementEngineer?.ctx;
    return (
      ctx?.shell?.getActiveTabName?.() === 'canon' &&
      ctx?.getState?.().currentTextId === 'txt-chapter'
    );
  });
});

test('generic CRUD create/save/reload persists', async ({ page }) => {
  await page.addInitScript(() => {
    window.MovementEngineer = window.MovementEngineer || {};
    window.MovementEngineer.bootstrapOptions = {
      ...(window.MovementEngineer.bootstrapOptions || {}),
      enableGenericCrud: true
    };
    if (window.localStorage.getItem('e2e-cleared') !== 'true') {
      window.localStorage.clear();
      window.localStorage.setItem('e2e-cleared', 'true');
    }
  });

  await gotoApp(page);

  await page.click('#btn-add-movement');
  const movementId = await page.evaluate(
    () => window.MovementEngineer?.ctx?.getState?.().currentMovementId || ''
  );

  await page.click('[data-tab="generic"]');
  await page.waitForSelector('[data-testid="generic-crud-root"]');

  await page
    .locator('[data-testid="generic-crud-collection"][data-collection-key="entities"]')
    .click();

  await page.click('[data-testid="generic-crud-new"]');
  await page.fill('[data-testid="generic-crud-field-id"] input', 'entity-1');
  await page.fill('[data-testid="generic-crud-field-name"] input', 'Test Entity');

  const movementSelect = page.locator(
    '[data-testid="generic-crud-field-movementId"] select'
  );
  if ((await movementSelect.count()) > 0 && movementId) {
    await movementSelect.selectOption(movementId);
  } else if (movementId) {
    const movementInput = page.locator(
      '[data-testid="generic-crud-field-movementId"] input'
    );
    if ((await movementInput.count()) > 0) {
      await movementInput.fill(movementId);
    }
  }

  await page.click('[data-testid="generic-crud-save"]');
  await page.waitForSelector('[data-testid="generic-crud-record"][data-record-id="entity-1"]');

  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.click('[data-tab="generic"]');
  await page.waitForSelector('[data-testid="generic-crud-root"]');
  await page
    .locator('[data-testid="generic-crud-collection"][data-collection-key="entities"]')
    .click();
  await page.waitForSelector('[data-testid="generic-crud-record"][data-record-id="entity-1"]');
});
