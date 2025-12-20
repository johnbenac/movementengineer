import { expect, test } from '@playwright/test';

const canonSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [{ id: 's1', movementId: 'm1', name: 'Shelf One', rootTextIds: ['book1'] }],
  texts: [
    { id: 'book1', movementId: 'm1', title: 'Book One', parentId: null, label: 'B1' },
    { id: 'chap1', movementId: 'm1', title: 'Chapter One', parentId: 'book1', label: '1' }
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
  await page.addInitScript(({ snapshot }) => {
    window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
      bootstrapOptions: { moduleTabs: ['canon'] }
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: canonSnapshot });
});

test('canon tab renders without fatal error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#shelf-list .shelf-card')).toHaveCount(1);
});

test('selecting shelf, book, and toc node updates editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await page.locator('#shelf-list .shelf-card').first().click();
  await page.locator('#book-list .book-card').first().click();
  await page.locator('#toc-tree .toc-node').first().click();

  await expect(page.locator('#text-editor input').first()).toHaveValue('Book One');
});

test('switching movements refreshes canon view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();

  await expect(page.locator('#shelf-list')).toContainText('No shelves yet.');
});
