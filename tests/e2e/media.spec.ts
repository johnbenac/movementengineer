import { expect, test } from '@playwright/test';

const mediaSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'Text One' },
    { id: 't2', movementId: 'm2', title: 'Second Text' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alice' },
    { id: 'e2', movementId: 'm1', name: 'Bob' },
    { id: 'e3', movementId: 'm2', name: 'Cara' }
  ],
  practices: [
    { id: 'p1', movementId: 'm1', name: 'Drill' },
    { id: 'p2', movementId: 'm2', name: 'March' }
  ],
  events: [
    { id: 'ev1', movementId: 'm1', name: 'Launch' },
    { id: 'ev2', movementId: 'm2', name: 'Parade' }
  ],
  rules: [],
  claims: [],
  media: [
    {
      id: 'mA',
      movementId: 'm1',
      title: 'First asset',
      kind: 'image',
      uri: 'http://example.com/a',
      linkedEntityIds: ['e1'],
      linkedPracticeIds: ['p1'],
      linkedEventIds: ['ev1'],
      linkedTextIds: ['t1'],
      tags: ['tag1'],
      description: 'For movement one'
    },
    {
      id: 'mB',
      movementId: 'm1',
      title: 'Second asset',
      kind: 'video',
      uri: 'http://example.com/b',
      linkedEntityIds: ['e2'],
      linkedPracticeIds: [],
      linkedEventIds: [],
      linkedTextIds: [],
      tags: []
    },
    {
      id: 'mC',
      movementId: 'm2',
      title: 'Other movement asset',
      kind: 'image',
      uri: 'http://example.com/c',
      linkedEntityIds: ['e3'],
      linkedPracticeIds: ['p2'],
      linkedEventIds: ['ev2'],
      linkedTextIds: ['t2'],
      tags: []
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
  await page.addInitScript(
    ({ snapshot }) => {
      window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
        bootstrapOptions: { moduleTabs: ['media'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: mediaSnapshot }
  );
});

test('renders media tab via module override and filters cards', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const cards = page.locator('#media-gallery .card');
  await expect(cards).toHaveCount(2);

  const entitySelect = page.locator('#media-entity-filter');
  await entitySelect.selectOption('e1');
  await expect(cards).toHaveCount(1);
});

test('switching movements updates media gallery', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  const cards = page.locator('#media-gallery .card');
  await expect(cards).toHaveCount(2);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(cards).toHaveCount(1);
});

test('shows empty-state message when no media match', async ({ page }) => {
  await page.addInitScript(() => {
    const raw = localStorage.getItem('movementDesigner.v3.snapshot');
    const snap = raw ? JSON.parse(raw) : null;
    if (snap) snap.media = [];
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snap));
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  await expect(page.locator('#media-gallery')).toContainText('No media match this filter.');
});

test('disables filters when no movement is selected', async ({ page }) => {
  const emptySnapshot = {
    ...mediaSnapshot,
    movements: [],
    media: [],
    entities: [],
    practices: [],
    events: [],
    texts: []
  };

  await page.addInitScript(
    ({ snapshot }) => {
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: emptySnapshot }
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  for (const id of [
    '#media-entity-filter',
    '#media-practice-filter',
    '#media-event-filter',
    '#media-text-filter'
  ]) {
    await expect(page.locator(id)).toBeDisabled();
  }
  await expect(page.locator('#media-gallery')).toContainText(
    'Create or select a movement on the left'
  );
});
