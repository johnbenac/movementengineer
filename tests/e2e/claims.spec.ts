import { expect, test } from '@playwright/test';

const claimsSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' },
    { id: 'm3', movementId: 'm3', name: 'Empty' }
  ],
  textCollections: [],
  texts: [],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Entity One' },
    { id: 'e2', movementId: 'm2', name: 'Entity Two' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [
    {
      id: 'c1',
      movementId: 'm1',
      category: 'Vision',
      text: 'Claim One',
      aboutEntityIds: ['e1'],
      tags: ['t1'],
      sourcesOfTruth: []
    },
    {
      id: 'c2',
      movementId: 'm1',
      category: 'Action',
      text: 'Claim Two',
      aboutEntityIds: [],
      tags: [],
      sourcesOfTruth: []
    },
    {
      id: 'c3',
      movementId: 'm2',
      category: 'Vision',
      text: 'Claim Three',
      aboutEntityIds: ['e2'],
      tags: [],
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
  await page.addInitScript(
    ({ snapshot }) => {
      window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
        bootstrapOptions: { moduleTabs: ['claims'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: claimsSnapshot }
  );
});

test('renders claims tab and filters by category', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const rows = page.locator('#claims-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.selectOption('#claims-category-filter', 'Vision');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates claims', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  const rows = page.locator('#claims-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(rows).toHaveCount(2);
});

test('shows empty-state message when movement has no claims', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  await page.locator('#movement-list li').filter({ hasText: 'Empty' }).click();

  await expect(page.locator('#claims-table-wrapper')).toContainText(
    'No claims match this filter.'
  );
});
