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
    { id: 't1', movementId: 'm1', title: 'Text One' },
    { id: 't2', movementId: 'm1', title: 'Text Two' },
    { id: 't3', movementId: 'm2', title: 'Other Text' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alice' },
    { id: 'e2', movementId: 'm1', name: 'Bob' },
    { id: 'e3', movementId: 'm2', name: 'Cara' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [
    {
      id: 'c1',
      movementId: 'm1',
      category: 'Safety',
      text: 'Stay safe',
      aboutEntityIds: ['e1'],
      sourceTextIds: ['t1'],
      tags: ['t1'],
      sourcesOfTruth: ['Manual']
    },
    {
      id: 'c2',
      movementId: 'm1',
      category: 'Impact',
      text: 'Help others',
      aboutEntityIds: ['e2'],
      sourceTextIds: ['t2'],
      tags: [],
      sourcesOfTruth: []
    },
    {
      id: 'c3',
      movementId: 'm2',
      category: 'Safety',
      text: 'Different movement',
      aboutEntityIds: ['e3'],
      sourceTextIds: ['t3'],
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

test('renders claims tab via module override and filters results', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Claims' }).click();
  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const rows = page.locator('#claims-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  const categorySelect = page.locator('#claims-category-filter');
  await categorySelect.selectOption('Safety');
  await expect(rows).toHaveCount(2);

  await categorySelect.selectOption('');
  const entitySelect = page.locator('#claims-entity-filter');
  await entitySelect.selectOption('e2');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates claims view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  const rows = page.locator('#claims-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(rows).toHaveCount(2);
});

test('shows empty-state when no claims match filters', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    if (snap) snap.claims = [];
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snap));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('#claims-table-wrapper')).toContainText('No claims match this filter.');
});

test('disables filters when no movement is available', async ({ page }) => {
  const emptySnapshot = {
    ...claimsSnapshot,
    movements: [],
    claims: [],
    entities: []
  };

  await page.addInitScript(
    ({ snapshot }) => {
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: emptySnapshot }
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Claims' }).click();

  await expect(page.locator('#claims-category-filter')).toBeDisabled();
  await expect(page.locator('#claims-entity-filter')).toBeDisabled();
  await expect(page.locator('#claims-table-wrapper')).toContainText(
    'Create or select a movement on the left'
  );
});
