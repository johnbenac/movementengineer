import { expect, test } from '@playwright/test';

const canonSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [
    { id: 'shelf-1', movementId: 'm1', name: 'Shelf One', rootTextIds: ['book-1'] },
    { id: 'shelf-2', movementId: 'm2', name: 'Shelf Two', rootTextIds: ['book-2'] }
  ],
  texts: [
    { id: 'book-1', movementId: 'm1', title: 'Book One', label: 'B1', parentId: null },
    { id: 't1', movementId: 'm1', parentId: 'book-1', title: 'Chapter 1', label: '1' },
    { id: 'book-2', movementId: 'm2', title: 'Book Two', label: 'B2', parentId: null }
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
});

test('selecting shelf, book, and TOC node updates editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await page.locator('.shelf-card', { hasText: 'Shelf One' }).click();
  await page.locator('.book-card', { hasText: 'Book One' }).click();
  await page.locator('#toc-tree .toc-node', { hasText: 'Chapter 1' }).click();

  await expect(page.locator('#text-editor input').first()).toHaveValue('Chapter 1');
});

test('switching movements updates the canon view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Library' }).click();

  await page.locator('#movement-list li', { hasText: 'Two' }).click();

  await expect(page.locator('#shelf-list')).toContainText('Shelf Two');
});
