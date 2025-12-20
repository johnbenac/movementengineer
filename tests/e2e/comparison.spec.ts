import path from 'path';
import { test, expect } from '@playwright/test';

const seededSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'alpha', movementId: 'alpha', name: 'Alpha' },
    { id: 'beta', movementId: 'beta', name: 'Beta' }
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

test('comparison tab renders and responds to selection', async ({ page }) => {
  const fileUrl = `file://${path.join(process.cwd(), 'index.html')}`;

  await page.addInitScript(value => {
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(value));
    localStorage.setItem('me:moduleTabs', 'comparison');
  }, seededSnapshot);

  await page.goto(fileUrl);
  await page.getByRole('button', { name: 'Comparison' }).click();

  const checkboxes = page.locator('#comparison-selector input[type=\"checkbox\"]');
  await expect(checkboxes).toHaveCount(2);

  const headerCells = page
    .locator('#comparison-table-wrapper table tr')
    .first()
    .locator('th');

  await expect(headerCells).toHaveCount(3);
  await expect(headerCells.nth(1)).toHaveText('Alpha');
  await expect(headerCells.nth(2)).toHaveText('Beta');

  await checkboxes.nth(1).uncheck();
  await expect(headerCells).toHaveCount(2);
  await expect(headerCells.nth(1)).toHaveText('Alpha');
});
