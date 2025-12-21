import { expect, test } from '@playwright/test';

const notesSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alice' },
    { id: 'e2', movementId: 'm2', name: 'Bob' }
  ],
  practices: [
    { id: 'p1', movementId: 'm1', name: 'Rite' },
    { id: 'p2', movementId: 'm2', name: 'Vow' }
  ],
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
    },
    {
      id: 'n2',
      movementId: 'm1',
      targetType: 'Practice',
      targetId: 'p1',
      author: 'B',
      body: 'Practice note',
      context: '',
      tags: []
    },
    {
      id: 'n3',
      movementId: 'm2',
      targetType: 'Entity',
      targetId: 'e2',
      author: 'C',
      body: 'Second movement note',
      context: '',
      tags: ['tag2', 'tag3']
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

test('renders notes tab and filters by target type + id', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Notes' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const typeSelect = page.locator('#notes-target-type-filter');
  const idSelect = page.locator('#notes-target-id-filter');
  const rows = page.locator('#notes-table-wrapper table tr');

  await expect(rows).toHaveCount(3);

  await typeSelect.selectOption('Entity');
  await expect(rows).toHaveCount(2);

  await expect(idSelect.locator('option')).toHaveCount(2);

  await idSelect.selectOption('e1');
  await expect(rows).toHaveCount(2);

  await typeSelect.selectOption('Practice');
  await expect(rows).toHaveCount(2);
});

test('switching movements updates notes list', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Notes' }).click();

  const rows = page.locator('#notes-table-wrapper table tr');

  await expect(rows).toHaveCount(3);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();

  await expect(rows).toHaveCount(2);
});

test('shows empty-state message when no notes exist for movement', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    if (snap) snap.notes = [];
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snap));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Notes' }).click();

  await expect(page.locator('#notes-table-wrapper')).toContainText(
    'No notes match this filter.'
  );
});

test('shows select-movement hint when there is no selected movement', async ({ page }) => {
  const emptySnapshot = {
    ...notesSnapshot,
    movements: [],
    notes: [],
    entities: [],
    practices: []
  };

  await page.addInitScript(
    ({ snapshot }) => {
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: emptySnapshot }
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Notes' }).click();

  await expect(page.locator('#notes-table-wrapper')).toContainText(
    'Create or select a movement on the left'
  );

  await expect(page.locator('#notes-target-type-filter')).toBeDisabled();
  await expect(page.locator('#notes-target-id-filter')).toBeDisabled();
});

test('supports creating, updating, and deleting notes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Notes' }).click();

  const tableRows = page.locator('#notes-table-wrapper table tr');

  await page.selectOption('#notes-form-target-type', 'Entity');
  await page.selectOption('#notes-form-target-id', 'e1');
  await page.fill('#notes-form-author', 'New Author');
  await page.fill('#notes-form-context', 'New Context');
  await page.fill('#notes-form-tags', 't1, t2');
  await page.fill('#notes-form-body', 'A brand new note');

  await page.click('#notes-save-btn');

  await expect(tableRows).toHaveCount(4);
  await expect(page.locator('#notes-table-wrapper')).toContainText('A brand new note');

  await page.getByRole('row', { name: /A brand new note/ }).click();
  await page.fill('#notes-form-body', 'Updated note body');
  await page.click('#notes-save-btn');

  await expect(page.locator('#notes-table-wrapper')).toContainText('Updated note body');

  page.once('dialog', dialog => dialog.accept());
  await page.click('#notes-delete-btn');

  await expect(tableRows).toHaveCount(3);
  await expect(page.locator('#notes-table-wrapper')).not.toContainText('Updated note body');
});
