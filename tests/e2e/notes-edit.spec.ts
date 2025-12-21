import { expect, test } from '@playwright/test';

const notesSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
  textCollections: [],
  texts: [],
  entities: [{ id: 'e1', movementId: 'm1', name: 'Alice' }],
  practices: [{ id: 'p1', movementId: 'm1', name: 'Warmup' }],
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
      context: '',
      tags: []
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

test('edits an existing note and keeps selection', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Notes' }).click();

  await page.locator('[data-note-id="n1"][data-note-action="edit"]').click();

  const bodyInput = page.locator('#note-body');
  await bodyInput.fill('Updated note body');
  await page.getByRole('button', { name: 'Save note' }).click();

  await expect(page.locator('#notes-table-wrapper')).toContainText('Updated note body');

  const storedBody = await page.evaluate(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    return snap?.notes?.find(n => n.id === 'n1')?.body;
  });
  expect(storedBody).toBe('Updated note body');

  const deleteBtn = page.locator('#note-delete-btn');
  await expect(deleteBtn).toBeEnabled();
});

test('updates target suggestions when target type changes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Notes' }).click();

  const targetTypeSelect = page.locator('#note-target-type');
  const targetIdOptions = page.locator('#notes-target-id-options option');

  await expect(targetTypeSelect).toHaveValue('Entity');
  await expect(targetIdOptions.first()).toHaveAttribute('value', 'e1');

  await targetTypeSelect.selectOption('Practice');

  await expect(targetIdOptions).toHaveCount(1);
  await expect(targetIdOptions.first()).toHaveAttribute('value', 'p1');
});
