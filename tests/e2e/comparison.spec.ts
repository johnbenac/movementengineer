import path from 'path';
import { expect, test } from '@playwright/test';

const snapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', name: 'Alpha' },
    { id: 'm2', name: 'Beta' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', parentId: null, title: 'Alpha root' },
    { id: 't2', movementId: 'm2', parentId: null, title: 'Beta root' },
    { id: 't3', movementId: 'm2', parentId: 't2', title: 'Beta child' }
  ],
  entities: [{ id: 'e1', movementId: 'm2', kind: 'actor', name: 'Beta Actor' }],
  practices: [],
  events: [],
  rules: [],
  claims: [],
  media: [],
  notes: []
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(seed => {
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(seed));
    localStorage.setItem('me:moduleTabs', 'comparison');
  }, snapshot);
});

test('renders comparison module and updates selection', async ({ page }) => {
  const fileUrl = `file://${path.join(__dirname, '..', '..', 'index.html')}`;
  await page.goto(fileUrl);

  await page.getByRole('button', { name: 'Comparison' }).click();

  await expect(page.locator('#comparison-selector input[type="checkbox"]')).toHaveCount(2);
  await expect(page.locator('#comparison-table-wrapper table')).toBeVisible();
  await expect(page.locator('#comparison-table-wrapper tr:first-child th')).toHaveCount(3);

  await page.locator('#comparison-selector input[value="m1"]').uncheck();
  await expect(page.locator('#comparison-table-wrapper tr:first-child th')).toHaveCount(2);
});
