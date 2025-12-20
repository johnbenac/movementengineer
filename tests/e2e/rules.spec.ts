import { expect, test } from '@playwright/test';

const rulesSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' },
    { id: 'm3', movementId: 'm3', name: 'Empty' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'Text One' },
    { id: 't2', movementId: 'm2', title: 'Text Two' }
  ],
  entities: [],
  practices: [
    { id: 'p1', movementId: 'm1', name: 'Practice One' },
    { id: 'p2', movementId: 'm2', name: 'Practice Two' }
  ],
  events: [],
  rules: [
    {
      id: 'r1',
      movementId: 'm1',
      kind: 'Policy',
      shortText: 'Rule One',
      domain: ['core'],
      supportingTextIds: ['t1'],
      relatedPracticeIds: ['p1']
    },
    {
      id: 'r2',
      movementId: 'm1',
      kind: 'Guideline',
      shortText: 'Rule Two',
      domain: ['secondary']
    },
    {
      id: 'r3',
      movementId: 'm2',
      kind: 'Policy',
      shortText: 'Rule Three',
      domain: ['core'],
      supportingTextIds: ['t2'],
      relatedPracticeIds: ['p2']
    }
  ],
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
        bootstrapOptions: { moduleTabs: ['rules'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: rulesSnapshot }
  );
});

test('renders rules tab without fatal banner and filters by kind', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.selectOption('#rules-kind-filter', 'Policy');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates rules view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(rows).toHaveCount(2);
});

test('shows empty state when movement has no rules', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  await page.locator('#movement-list li').filter({ hasText: 'Empty' }).click();

  await expect(page.locator('#rules-table-wrapper')).toContainText(
    'No rules match this filter.'
  );
});
