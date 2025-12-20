import { expect, test } from '@playwright/test';

const canonSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [
    { id: 's1', movementId: 'm1', name: 'Shelf One', rootTextIds: ['b1'] },
    { id: 's2', movementId: 'm2', name: 'Shelf Two', rootTextIds: ['b2'] }
  ],
  texts: [
    { id: 'b1', movementId: 'm1', title: 'Book One', label: 'B1', parentId: null },
    { id: 'c1', movementId: 'm1', title: 'Chapter 1', label: 'Ch1', parentId: 'b1' },
    { id: 'b2', movementId: 'm2', title: 'Book Two', label: 'B2', parentId: null }
  ],
  entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }],
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
        bootstrapOptions: { moduleTabs: ['canon'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: canonSnapshot }
  );
});

test('canon tab renders without fatal error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#shelf-list .shelf-card')).toHaveCount(1);
});

test('selecting shelf, book, and toc node updates the editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await page.locator('#shelf-list .shelf-card').first().click();
  await page.locator('#book-list .book-card').first().click();
  await page.locator('#toc-tree .toc-node').first().click();

  await expect(page.locator('#text-editor input').first()).toHaveValue('Book One');
});

test('switching movements updates canon view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await expect(page.locator('#book-list .book-card')).toHaveCount(1);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();

  await expect(page.locator('#book-list .book-card')).toContainText('Book Two');
});
