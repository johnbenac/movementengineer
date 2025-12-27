import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

const mediaSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'Movement One' },
    { id: 'm2', movementId: 'm2', name: 'Movement Two' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'Doc One' },
    { id: 't2', movementId: 'm2', title: 'Doc Two' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Entity One' },
    { id: 'e2', movementId: 'm2', name: 'Entity Two' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [],
  media: [
    {
      id: 'm1-img',
      movementId: 'm1',
      kind: 'image',
      title: 'Sunrise',
      sourceTextIds: ['t1'],
      aboutEntityIds: ['e1']
    },
    {
      id: 'm2-img',
      movementId: 'm2',
      kind: 'image',
      title: 'Sunset',
      sourceTextIds: ['t2'],
      aboutEntityIds: ['e2']
    }
  ],
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
  }, { snapshot: mediaSnapshot });
});

test('renders media collection tab from the model', async ({ page }) => {
  await gotoApp(page);
  await page.locator('#movement-list li').first().click();

  await page.getByRole('button', { name: 'Media' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('[data-testid="generic-crud-record"]')).toHaveCount(1);
});
