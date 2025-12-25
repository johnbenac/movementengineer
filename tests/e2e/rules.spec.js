import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

const rulesSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'T1' },
    { id: 't2', movementId: 'm2', title: 'T2' }
  ],
  entities: [{ id: 'e1', movementId: 'm1', name: 'Leader' }],
  practices: [{ id: 'p1', movementId: 'm1', name: 'Practice One', kind: 'ritual' }],
  events: [],
  rules: [
    {
      id: 'r1',
      movementId: 'm1',
      kind: 'Norm',
      shortText: 'Do thing',
      domain: ['c1'],
      supportingTextIds: ['t1'],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: ['Source']
    },
    {
      id: 'r2',
      movementId: 'm1',
      kind: 'Guideline',
      shortText: 'Avoid bad',
      domain: ['c2'],
      supportingTextIds: [],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: []
    },
    {
      id: 'r3',
      movementId: 'm2',
      kind: 'Norm',
      shortText: 'Other movement rule',
      domain: ['c1'],
      supportingTextIds: ['t2'],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: []
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
  await page.addInitScript(({ snapshot }) => {
    window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
      bootstrapOptions: { moduleTabs: ['rules'] }
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: rulesSnapshot });
});

test('renders rules tab via module override', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#rules-table-wrapper table tr')).toHaveCount(3);
});

test('filters rules by kind and domain', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Rules' }).click();

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#rules-kind-filter').selectOption('Norm');
  await expect(rows).toHaveCount(2);

  await page.locator('#rules-domain-filter').fill('c1');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates rules list', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Rules' }).click();

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(rows).toHaveCount(2);
});

test('supports creating and deleting rules from the editor', async ({ page }) => {
  await gotoApp(page);
  await page.getByRole('button', { name: 'Rules' }).click();

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.getByRole('button', { name: 'Add rule' }).click();
  await page.getByLabel('Short text').fill('Brand new rule');
  await page.locator('#rules-editor-kind').selectOption('must_do');
  await page.locator('#rules-editor-supporting-texts').selectOption('t1');
  await page.locator('#rules-editor-sourcesOfTruth').fill('Tradition');
  await page.getByRole('button', { name: 'Save rule' }).click();

  await expect(rows).toHaveCount(4);
  await expect(page.locator('#rules-table-wrapper')).toContainText('Brand new rule');

  await page.getByRole('button', { name: 'Delete rule' }).click();
  await expect(rows).toHaveCount(3);
  await expect(page.locator('#rules-table-wrapper')).not.toContainText('Brand new rule');
});

test('shows empty-state message when no rules match', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    if (snap) snap.rules = [];
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snap));
  });

  await gotoApp(page);
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#rules-table-wrapper')).toContainText(
    'No rules match this filter.'
  );
});
