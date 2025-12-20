import { expect, test } from '@playwright/test';
import path from 'path';

const indexUrl = `file://${path.join(process.cwd(), 'index.html')}`;

const comparisonSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [],
  entities: [],
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
      bootstrapOptions: { moduleTabs: ['comparison'] }
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: comparisonSnapshot });
});

test('renders comparison tab via module override and responds to toggles', async ({ page }) => {
  await page.goto(indexUrl);

  await page.getByRole('button', { name: 'Comparison' }).click();

  const selector = page.locator('#comparison-selector');
  await expect(selector.locator('input[type="checkbox"]')).toHaveCount(2);

  const headerCells = page.locator('#comparison-table-wrapper table tr').first().locator('th');
  await expect(headerCells).toHaveCount(3);
  await expect(headerCells.nth(0)).toHaveText('Metric');
  await expect(headerCells.nth(1)).toHaveText('One');
  await expect(headerCells.nth(2)).toHaveText('Two');

  await selector.locator('input[value="m2"]').uncheck();

  await expect(headerCells).toHaveCount(2);
  await expect(headerCells.nth(0)).toHaveText('Metric');
  await expect(headerCells.nth(1)).toHaveText('One');
});
