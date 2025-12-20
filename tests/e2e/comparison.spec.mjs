import path from 'path';
import { fileURLToPath } from 'url';
import { expect, test } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pageUrl = `file://${path.join(__dirname, '..', '..', 'index.html')}`;

const seededSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'mov-alpha', movementId: 'mov-alpha', name: 'Alpha' },
    { id: 'mov-bravo', movementId: 'mov-bravo', name: 'Bravo' }
  ],
  textCollections: [],
  texts: [
    { id: 'txt-alpha-root', movementId: 'mov-alpha', title: 'Alpha Root' },
    { id: 'txt-bravo-root', movementId: 'mov-bravo', title: 'Bravo Root' },
    { id: 'txt-bravo-child', movementId: 'mov-bravo', parentId: 'txt-bravo-root', title: 'Bravo Child' }
  ],
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
  await page.addInitScript(value => {
    window.localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(value.snapshot));
    window.localStorage.setItem('me:moduleTabs', value.moduleTabs);
  }, { snapshot: seededSnapshot, moduleTabs: 'comparison' });
});

test('renders comparison module tab and updates columns on selection', async ({ page }) => {
  await page.goto(pageUrl);
  await page.getByRole('button', { name: 'Comparison' }).click();

  const checkboxes = page.locator('#comparison-selector input[type="checkbox"]');
  await expect(checkboxes).toHaveCount(2);

  const headerCells = page.locator('#comparison-table-wrapper tr').first().locator('th');
  await expect(headerCells).toHaveCount(3);

  await checkboxes.nth(1).uncheck();
  await expect(headerCells).toHaveCount(2);
});
