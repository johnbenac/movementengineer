import { expect, test } from '@playwright/test';

const graphSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [{ id: 'm1', movementId: 'm1', name: 'Graph Movement' }],
  textCollections: [],
  texts: [],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Entity One' },
    { id: 'e2', movementId: 'm1', name: 'Entity Two' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [],
  media: [],
  notes: [],
  __repoInfo: null,
  __repoSource: null,
  __repoFileIndex: {},
  __repoRawMarkdownByPath: {},
  __repoBaselineByMovement: {}
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ snapshot }) => {
      window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
        bootstrapOptions: { moduleTabs: ['graph'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: graphSnapshot }
  );
});

test('graph tab renders without fatal error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graph' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#gw-canvas')).toBeVisible();
});

test('create entity via graph workbench', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graph' }).click();

  await page.fill('#gw-add-entity-name', 'New Entity');
  await page.click('#gw-add-entity-form button[type="submit"]');

  await expect(page.locator('#gw-add-entity-name')).toHaveValue('');
});

test('search result selection updates selected panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graph' }).click();

  await page.locator('#gw-search-results li').first().click();

  await expect(page.locator('#gw-selected-body')).toContainText(/Entity/);
});
