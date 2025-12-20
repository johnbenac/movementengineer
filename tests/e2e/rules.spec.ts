import { expect, test } from '@playwright/test';

const baseSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'Text A' },
    { id: 't2', movementId: 'm2', title: 'Text B' }
  ],
  entities: [],
  practices: [{ id: 'p1', movementId: 'm1', name: 'Practice' }],
  events: [],
  rules: [
    {
      id: 'r1',
      movementId: 'm1',
      shortText: 'Rule one',
      kind: 'Guideline',
      domain: ['safety'],
      appliesTo: ['all'],
      tags: ['tag1'],
      supportingTextIds: ['t1'],
      supportingClaimIds: [],
      relatedPracticeIds: ['p1'],
      sourcesOfTruth: ['Source']
    },
    {
      id: 'r2',
      movementId: 'm1',
      shortText: 'Rule two',
      kind: 'Policy',
      domain: ['ops'],
      appliesTo: [],
      tags: [],
      supportingTextIds: [],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: []
    },
    {
      id: 'r3',
      movementId: 'm2',
      shortText: 'Other rule',
      kind: 'Guideline',
      domain: ['ethics'],
      appliesTo: [],
      tags: [],
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
  await page.addInitScript(
    ({ snapshot }) => {
      window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
        bootstrapOptions: { moduleTabs: ['rules'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: baseSnapshot }
  );
});

test('renders rules tab via module override without fatal banner', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#rules-table-wrapper table tr')).toHaveCount(3);
});

test('filters rules by kind and domain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  const kindSelect = page.locator('#rules-kind-filter');
  const domainInput = page.locator('#rules-domain-filter');
  const rows = page.locator('#rules-table-wrapper table tr');

  await expect(rows).toHaveCount(3);

  await kindSelect.selectOption('Policy');
  await expect(rows).toHaveCount(2);

  await kindSelect.selectOption('Guideline');
  await domainInput.fill('safety');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates rules view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.locator('#rules-table-wrapper')).toContainText('Other rule');
});

test('shows empty-state when no rules match filters', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    if (snap) snap.rules = [];
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snap));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#rules-table-wrapper')).toContainText('No rules match this filter.');
});
