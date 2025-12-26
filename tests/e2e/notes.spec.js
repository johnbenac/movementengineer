import { expect, test } from '@playwright/test';
import { gotoApp } from '../helpers/gotoApp';

const notesSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'Root' },
    { id: 't2', movementId: 'm2', title: 'Other' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Entity One' },
    { id: 'e2', movementId: 'm2', name: 'Entity Two' }
  ],
  practices: [],
  events: [],
  rules: [],
  claims: [],
  media: [],
  notes: [
    {
      id: 'n1',
      movementId: 'm1',
      targetType: 'Entity',
      targetId: 'e1',
      author: 'A',
      body: 'Entity note',
      context: 'Context 1',
      tags: ['tag1']
    }
  ],
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
        bootstrapOptions: { moduleTabs: ['notes'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: notesSnapshot }
  );
});

test('creates notes with polymorphic target options', async ({ page }) => {
  await gotoApp(page);

  await page.getByTestId('tab-notes').click();
  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  await page.locator('#movement-list li').filter({ hasText: 'One' }).click();

  const notesTab = page.getByTestId('collection-tab-notes');
  await notesTab.getByTestId('generic-crud-new').click();

  const movementField = notesTab.getByTestId('generic-crud-field-movementId').locator('select');
  await movementField.selectOption('m1');

  const targetTypeField = notesTab.getByTestId('generic-crud-field-targetType').locator('select');
  await targetTypeField.selectOption('TextNode');

  const targetIdOptions = notesTab.locator('[data-testid="ref-options-targetId"] option');
  await expect(targetIdOptions).toHaveCount(1);
  const textOptions = await targetIdOptions.evaluateAll(options =>
    options.map(option => option.value)
  );
  expect(textOptions).toEqual(['t1']);

  const targetIdInput = notesTab.getByTestId('generic-crud-field-targetId').locator('input');
  await targetIdInput.fill('t1');

  await targetTypeField.selectOption('Entity');
  await expect(targetIdOptions).toHaveCount(1);
  const entityOptions = await targetIdOptions.evaluateAll(options =>
    options.map(option => option.value)
  );
  expect(entityOptions).toEqual(['e1']);
  await targetIdInput.fill('e1');

  const bodyField = notesTab.getByTestId('generic-crud-field-body').locator('textarea');
  await bodyField.fill('New note');

  await notesTab.getByTestId('generic-crud-save').click();

  const records = notesTab.getByTestId('generic-crud-record');
  await expect(records.filter({ hasText: 'New note' })).toHaveCount(1);
});
