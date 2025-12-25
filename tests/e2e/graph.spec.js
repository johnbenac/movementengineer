import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

const graphSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
  textCollections: [],
  texts: [],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alice', kind: 'Person' },
    { id: 'e2', movementId: 'm1', name: 'Bob', kind: 'Person' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [],
  media: [],
  notes: [],
  relations: [
    { id: 'rel1', fromId: 'e1', toId: 'e2', type: 'related_to', movementId: 'm1' }
  ],
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
  await gotoApp(page);
  await page.getByRole('button', { name: 'Graph' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#gw-canvas')).toBeVisible();
});

test('creating an entity adds it to the workbench', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Graph' }).click();

  await page.fill('#gw-add-entity-name', 'Charlie');
  await page.fill('#gw-add-entity-kind', 'Person');
  await page.click('#gw-add-entity-form button[type="submit"]');

  await expect(page.locator('#gw-search-results')).toContainText('Charlie');
});

test('selecting a node updates the selected panel', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Graph' }).click();

  const firstResult = page.locator('#gw-search-results .graph-search-item').first();
  await firstResult.click();

  await expect(page.locator('#gw-selected-body')).not.toBeEmpty();
});
