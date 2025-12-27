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

test('import -> collection tab lists imported texts', async ({ page }) => {
  const fixture = {
    movements: [{ id: 'm1', movementId: 'm1', name: 'Movement One' }],
    textCollections: [
      {
        id: 'tc1',
        movementId: 'm1',
        name: 'Primary Shelf',
        rootTextIds: ['txt-root']
      }
    ],
    texts: [
      { id: 'txt-root', movementId: 'm1', title: 'Root Text' },
      { id: 'txt-chapter', movementId: 'm1', title: 'Chapter 1', parentId: 'txt-root' }
    ]
  };

  await page.addInitScript(({ fixture }) => {
    const stub = {
      importMovementRepo: async () => fixture,
      parseGitHubRepoUrl: () => ({ owner: 'example', repo: 'repo' })
    };

    Object.defineProperty(window, 'MarkdownDatasetLoader', {
      configurable: true,
      get: () => stub,
      set: () => {}
    });
  }, { fixture });

  await gotoApp(page);

  await page.locator('#btn-import-from-github').click();
  await page.locator('#github-import-url').fill('https://github.com/example/repo');
  await page.locator('#github-import-form').evaluate(form => form.requestSubmit());

  await page.waitForFunction(
    () => window.MovementEngineer?.ctx?.getState?.().snapshot?.movements?.length === 1
  );

  await page.locator('#movement-list li').first().click();
  await page.getByRole('button', { name: 'Texts' }).click();
  await page.locator('[data-testid="generic-crud-record"]', { hasText: 'Root Text' }).click();

  await expect(page.locator('.generic-crud-detail-header h3')).toHaveText('Root Text');
});

test('generic CRUD create/save reload persists', async ({ page }) => {
  await page.addInitScript(() => {
    window.MovementEngineer = window.MovementEngineer || {};
    window.MovementEngineer.bootstrapOptions = {
      ...window.MovementEngineer.bootstrapOptions,
      enableGenericCrud: true
    };
    const clearedKey = '__me_e2e_cleared__';
    if (window.localStorage && !window.localStorage.getItem(clearedKey)) {
      window.localStorage.clear();
      window.localStorage.setItem(clearedKey, 'true');
    }
  });

  await gotoApp(page);

  await page.locator('#btn-add-movement').click();
  const movementId = await page.evaluate(
    () => window.MovementEngineer?.ctx?.getState?.().currentMovementId || ''
  );

  await page.locator('[data-tab="generic"]').click();
  await page
    .getByTestId('generic-crud-collection-select')
    .locator('[data-collection-key="entities"]')
    .click();

  await page.getByTestId('generic-crud-new').click();
  await page
    .getByTestId('generic-crud-field-name')
    .locator('input, textarea')
    .fill('Test Entity');
  const movementField = page.getByTestId('generic-crud-field-movementId');
  const movementSelect = movementField.locator('select');
  if (await movementSelect.count()) {
    await movementSelect.selectOption(movementId);
  } else {
    await movementField.locator('input, textarea').fill(movementId);
  }

  await page.getByTestId('generic-crud-save').click();
  await page.waitForFunction(() =>
    window.MovementEngineer?.ctx?.getState?.().snapshot?.entities?.some(
      entity => entity?.name === 'Test Entity'
    )
  );

  await page.reload({ waitUntil: 'domcontentloaded' });

  await page.locator('[data-tab="generic"]').click();
  await page
    .getByTestId('generic-crud-collection-select')
    .locator('[data-collection-key="entities"]')
    .click();

  await page.waitForFunction(() =>
    window.MovementEngineer?.ctx?.getState?.().snapshot?.entities?.some(
      entity => entity?.name === 'Test Entity'
    )
  );

  const hasEntity = await page.evaluate(
    () =>
      window.MovementEngineer?.ctx?.getState?.().snapshot?.entities?.some(
        entity => entity?.name === 'Test Entity'
      ) || false
  );
  expect(hasEntity).toBe(true);
});
