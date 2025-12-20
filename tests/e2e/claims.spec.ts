import { expect, test } from '@playwright/test';

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
      bootstrapOptions: { moduleTabs: ['claims'] }
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: claimsSnapshot });
});

test('renders claims tab via module override', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#claims-table-wrapper table tr')).toHaveCount(3);
});

test('filters claims by category and entity', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  const rows = page.locator('#claims-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#claims-category-filter').selectOption('Ethos');
  await expect(rows).toHaveCount(2); // header + 1 row

  await page.locator('#claims-entity-filter').selectOption('e1');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates claims list', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  const rows = page.locator('#claims-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(rows).toHaveCount(2);
});

test('shows empty-state message when no claims match', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    if (snap) snap.claims = [];
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snap));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('#claims-table-wrapper')).toContainText(
    'No claims match this filter.'
  );
});
