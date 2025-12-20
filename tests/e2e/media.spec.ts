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
    { id: 't1', movementId: 'm1', title: 'T1' },
    { id: 't2', movementId: 'm2', title: 'T2' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Entity 1' },
    { id: 'e2', movementId: 'm2', name: 'Entity 2' }
  ],
  practices: [
    { id: 'p1', movementId: 'm1', name: 'Practice 1' },
    { id: 'p2', movementId: 'm2', name: 'Practice 2' }
  ],
  events: [
    { id: 'ev1', movementId: 'm1', name: 'Event 1' },
    { id: 'ev2', movementId: 'm2', name: 'Event 2' }
  ],
  rules: [],
  claims: [],
  media: [
    {
      id: 'm1',
      movementId: 'm1',
      title: 'Media One',
      kind: 'photo',
      uri: 'http://one',
      description: 'Desc',
      tags: ['tag1'],
      linkedEntityIds: ['e1'],
      linkedPracticeIds: ['p1'],
      linkedEventIds: ['ev1'],
      linkedTextIds: ['t1']
    },
    {
      id: 'm2',
      movementId: 'm1',
      title: 'Media Two',
      kind: 'video',
      uri: 'http://two',
      description: '',
      tags: [],
      linkedEntityIds: [],
      linkedPracticeIds: [],
      linkedEventIds: [],
      linkedTextIds: []
    },
    {
      id: 'm3',
      movementId: 'm2',
      title: 'Media Three',
      kind: 'audio',
      uri: 'http://three',
      linkedEntityIds: ['e2'],
      linkedPracticeIds: ['p2'],
      linkedEventIds: ['ev2'],
      linkedTextIds: ['t2']
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
      bootstrapOptions: { moduleTabs: ['media'] }
    });
    localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
  }, { snapshot: mediaSnapshot });
});

test('renders media tab via module override', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#media-gallery .card')).toHaveCount(2);
});

test('filters media by entity and practice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  const cards = page.locator('#media-gallery .card');
  await expect(cards).toHaveCount(2);

  await page.locator('#media-entity-filter').selectOption('e1');
  await expect(cards).toHaveCount(1);

  await page.locator('#media-practice-filter').selectOption('p1');
  await expect(cards).toHaveCount(1);
});

test('switching movements updates media list', async ({ page }) => {
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
