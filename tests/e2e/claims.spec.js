import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

const claimsSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'First text' },
    { id: 't2', movementId: 'm2', title: 'Second text' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alice' },
    { id: 'e2', movementId: 'm2', name: 'Bob' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [
    {
      id: 'c1',
      movementId: 'm1',
      category: 'Ethos',
      text: 'First claim',
      aboutEntityIds: ['e1'],
      sourceTextIds: ['t1'],
      sourcesOfTruth: ['Source A']
    },
    {
      id: 'c2',
      movementId: 'm1',
      category: 'Practice',
      text: 'Second claim',
      aboutEntityIds: [],
      sourceTextIds: ['t1'],
      sourcesOfTruth: []
    },
    {
      id: 'c3',
      movementId: 'm2',
      category: 'Ethos',
      text: 'Third claim',
      aboutEntityIds: ['e2'],
      sourceTextIds: ['t2'],
      sourcesOfTruth: []
    }
  ],
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
      bootstrapOptions: {}
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: claimsSnapshot });
});

test('renders claims collection tab from the model', async ({ page }) => {
  await gotoApp(page);
  await page.locator('#movement-list li').first().click();

  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('[data-testid="generic-crud-record"]')).toHaveCount(2);
});

test('switching movements updates claims list', async ({ page }) => {
  await gotoApp(page);
  await page.locator('#movement-list li').first().click();
  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('[data-testid="generic-crud-record"]')).toHaveCount(2);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(page.locator('[data-testid="generic-crud-record"]')).toHaveCount(1);
});
