import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

const importFixtureSnapshot = {
  specVersion: '2.3',
  movements: [{ id: 'm1', name: 'Fixture Movement' }],
  textCollections: [
    {
      id: 'tc1',
      name: 'Fixture Shelf',
      movementId: 'm1',
      rootTextIds: ['txt-root']
    }
  ],
  texts: [
    {
      id: 'txt-root',
      name: 'Root Text',
      movementId: 'm1',
      textCollectionId: 'tc1'
    },
    {
      id: 'txt-chapter',
      name: 'Chapter 1',
      movementId: 'm1',
      textCollectionId: 'tc1',
      parentId: 'txt-root'
    }
  ]
};

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

test('import -> collections -> chip routes via canonical router', async ({ page }) => {
  await page.addInitScript(snapshot => {
    const stub = {
      importMovementRepo: async () => snapshot
    };
    Object.defineProperty(window, 'MarkdownDatasetLoader', {
      configurable: true,
      get: () => stub,
      set: () => {}
    });
  }, importFixtureSnapshot);

  await gotoApp(page);

  await page.locator('#btn-import-from-github').click();
  await page.locator('#github-import-overlay').waitFor({ state: 'visible' });
  await page.locator('#github-import-url').fill('https://github.com/example/repo');
  await page.locator('#github-import-form').evaluate(form => form.requestSubmit());

  await page.waitForFunction(() => {
    const snapshot = window.MovementEngineer?.ctx?.getState?.().snapshot;
    return Array.isArray(snapshot?.texts) && snapshot.texts.length === 2;
  });

  await page.locator('[data-tab="collections"]').click();
  await page.selectOption('#collection-select', 'texts');
  await page.locator('#collection-items li[data-id="txt-root"]').click();
  await page.getByRole('button', { name: 'Chapter 1' }).click();

  await page.waitForFunction(() => {
    const ctx = window.MovementEngineer?.ctx;
    return (
      ctx?.shell?.getActiveTabName?.() === 'canon' &&
      ctx?.getState?.().currentTextId === 'txt-chapter'
    );
  });
});

test('generic CRUD create -> save -> reload persists', async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('__e2e_storage_init')) {
      window.localStorage.clear();
      window.localStorage.setItem('__e2e_storage_init', '1');
    }
    window.MovementEngineer = window.MovementEngineer || {};
    window.MovementEngineer.bootstrapOptions = {
      ...(window.MovementEngineer.bootstrapOptions || {}),
      enableGenericCrud: true
    };
  });

  await gotoApp(page);

  await page.locator('#btn-add-movement').click();
  await page.locator('#movement-name').fill('E2E Movement');
  await page.locator('#btn-save-movement').click();

  const movementId = await page.evaluate(() =>
    window.MovementEngineer?.ctx?.getState?.().currentMovementId
  );
  expect(movementId).toBeTruthy();

  await page.locator('[data-tab="generic"]').click();
  await page.getByTestId('generic-crud-root').waitFor();
  const collectionList = page.getByTestId('generic-crud-collection-select');
  await collectionList.getByText(/entity/i).click();

  await page.getByTestId('generic-crud-new').click();
  await page
    .getByTestId('generic-crud-field-name')
    .locator('input, textarea')
    .fill('E2E Entity');
  const movementField = page.getByTestId('generic-crud-field-movementId');
  const movementSelect = movementField.locator('select');
  if (await movementSelect.count()) {
    await movementSelect.selectOption(String(movementId));
  } else {
    await movementField.locator('input, textarea').fill(String(movementId));
  }
  await page.getByTestId('generic-crud-save').click();

  await expect(
    page.getByTestId('generic-crud-record').filter({ hasText: 'E2E Entity' })
  ).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.locator('[data-tab="generic"]').click();
  await page.getByTestId('generic-crud-root').waitFor();
  const collectionListAfter = page.getByTestId('generic-crud-collection-select');
  await collectionListAfter.getByText(/entity/i).click();

  await expect(
    page.getByTestId('generic-crud-record').filter({ hasText: 'E2E Entity' })
  ).toBeVisible();
});
