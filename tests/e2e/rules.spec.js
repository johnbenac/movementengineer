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
      bootstrapOptions: {}
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: rulesSnapshot });
});

test('renders rules collection tab from the model', async ({ page }) => {
  await gotoApp(page);
  await page.locator('#movement-list li').first().click();

  await page.getByRole('button', { name: 'Rules' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('[data-testid="generic-crud-record"]')).toHaveCount(2);
});
