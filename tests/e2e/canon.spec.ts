import { expect, test } from '@playwright/test';

const canonSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [
    { id: 's1', movementId: 'm1', name: 'Shelf One', rootTextIds: ['b1'] }
  ],
  texts: [
    {
      id: 'b1',
      movementId: 'm1',
      parentId: null,
      title: 'Book One',
      label: 'B1',
      depth: 0,
      content: 'Book content'
    },
    {
      id: 'c1',
      movementId: 'm1',
      parentId: 'b1',
      title: 'Chapter',
      label: 'C1',
      depth: 1,
      content: 'Chapter content'
    }
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

  await page.getByRole('button', { name: 'Canon' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
});

test('shelf to book to toc updates editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Canon' }).click();

  await page.locator('.shelf-card').first().click();
  await page.locator('.book-card').first().click();
  await page.locator('.toc-node').first().click();

  const titleInput = page.locator('#text-editor input[type="text"]').first();
  await expect(titleInput).toHaveValue(/Book/);
});

test('switching movements updates canon view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Canon' }).click();

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();

  await expect(page.locator('#shelf-list')).toContainText('No shelves yet');
});
