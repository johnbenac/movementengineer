import { expect, test } from '@playwright/test';

const graphSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
  textCollections: [],
  texts: [],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alpha', kind: 'Person' },
    { id: 'e2', movementId: 'm1', name: 'Beta', kind: 'Place' }
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
  await page.addInitScript(({ snapshot }) => {
    window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
      bootstrapOptions: { moduleTabs: ['graph'] }
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: graphSnapshot });
});

test('graph tab renders without fatal error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graph' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#graph-workbench')).toBeVisible();
});

test('creating an entity through the form shows it in search results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graph' }).click();

  await page.fill('#gw-add-entity-name', 'New entity');
  await page.fill('#gw-add-entity-kind', 'Role');
  await page.locator('#gw-add-entity-form').press('Enter');

  await expect(page.locator('.graph-search-item', { hasText: 'New entity' })).toHaveCount(1);
});

test('selecting a search result populates selected panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Graph' }).click();

  await page.locator('.graph-search-item').first().click();

  await expect(page.locator('#gw-selected-body')).toContainText('Alpha');
});
