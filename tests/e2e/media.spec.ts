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
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Alice' },
    { id: 'e2', movementId: 'm2', name: 'Bob' }
  ],
  practices: [
    { id: 'p1', movementId: 'm1', name: 'Practice One' },
    { id: 'p2', movementId: 'm2', name: 'Practice Two' }
  ],
  events: [
    { id: 'ev1', movementId: 'm1', name: 'Event One' },
    { id: 'ev2', movementId: 'm2', name: 'Event Two' }
  ],
  rules: [],
  claims: [],
  media: [
    {
      id: 'm1',
      movementId: 'm1',
      title: 'Media One',
      kind: 'image',
      uri: 'http://example.com/1',
      description: 'Desc 1',
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
      uri: 'http://example.com/2',
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
      title: 'Other movement media',
      kind: 'image',
      uri: 'http://example.com/3',
      description: '',
      tags: [],
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
  await page.addInitScript(
    ({ snapshot }) => {
      window.MovementEngineer = Object.assign(window.MovementEngineer || {}, {
        bootstrapOptions: { moduleTabs: ['media'] }
      });
      localStorage.setItem('movementDesigner.v3.snapshot', JSON.stringify(snapshot));
    },
    { snapshot: baseSnapshot }
  );
});

test('renders media tab via module override without fatal banner', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);
  await expect(page.locator('#media-gallery .card')).toHaveCount(2);
});

test('filters media by linked entity', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  const entitySelect = page.locator('#media-entity-filter');
  const cards = page.locator('#media-gallery .card');

  await expect(cards).toHaveCount(2);

  await entitySelect.selectOption('e1');
  await expect(cards).toHaveCount(1);
  await expect(page.locator('#media-gallery')).toContainText('Media One');
});

test('switching movements updates media view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  const cards = page.locator('#media-gallery .card');
  await expect(cards).toHaveCount(2);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(cards).toHaveCount(1);
  await expect(page.locator('#media-gallery')).toContainText('Other movement media');
});

test('shows empty-state when no media match filters', async ({ page }) => {
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
