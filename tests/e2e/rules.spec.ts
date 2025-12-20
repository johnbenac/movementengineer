import { expect, test } from '@playwright/test';

const rulesSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [],
  entities: [],
  practices: [],
  events: [],
  rules: [
    {
      id: 'r1',
      movementId: 'm1',
      kind: 'Safety',
      shortText: 'Stay safe',
      domain: ['safety'],
      appliesTo: ['everyone'],
      tags: [],
      supportingTextIds: [],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: []
    },
    {
      id: 'r2',
      movementId: 'm1',
      kind: 'Conduct',
      shortText: 'Be kind',
      domain: ['conduct', 'care'],
      appliesTo: ['members'],
      tags: ['kindness'],
      supportingTextIds: [],
      supportingClaimIds: [],
      relatedPracticeIds: [],
      sourcesOfTruth: []
    },
    {
      id: 'r3',
      movementId: 'm2',
      kind: 'Safety',
      shortText: 'Other movement rule',
      domain: ['safety'],
      appliesTo: [],
      tags: [],
      supportingTextIds: [],
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
    { snapshot: rulesSnapshot }
  );
});

test('renders rules tab via module override and filters by kind/domain', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const rows = page.locator('#rules-table-wrapper table tr');
  await expect(rows).toHaveCount(3);

  const kindSelect = page.locator('#rules-kind-filter');
  await kindSelect.selectOption('Safety');
  await expect(rows).toHaveCount(2);

  await kindSelect.selectOption('');
  const domainInput = page.locator('#rules-domain-filter');
  await domainInput.fill('conduct');
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

test('shows empty-state when no rules exist', async ({ page }) => {
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

test('disables controls when there is no selected movement', async ({ page }) => {
  const emptySnapshot = {
    ...rulesSnapshot,
    movements: [],
    rules: []
  };

  await page.addInitScript(
    ({ snapshot }) => {
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: emptySnapshot }
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#rules-kind-filter')).toBeDisabled();
  await expect(page.locator('#rules-domain-filter')).toBeDisabled();
  await expect(page.locator('#rules-table-wrapper')).toContainText(
    'Create or select a movement on the left'
  );
});
