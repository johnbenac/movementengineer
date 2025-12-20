import { expect, test } from '@playwright/test';

const mediaSnapshot = {
  version: '2.3',
  specVersion: '2.3',
  movements: [
    { id: 'm1', movementId: 'm1', name: 'One' },
    { id: 'm2', movementId: 'm2', name: 'Two' },
    { id: 'm3', movementId: 'm3', name: 'Empty' }
  ],
  textCollections: [],
  texts: [
    { id: 't1', movementId: 'm1', title: 'Text One' },
    { id: 't2', movementId: 'm2', title: 'Text Two' }
  ],
  entities: [
    { id: 'e1', movementId: 'm1', name: 'Entity One' },
    { id: 'e2', movementId: 'm2', name: 'Entity Two' }
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
      id: 'mda1',
      movementId: 'm1',
      title: 'Media One',
      uri: 'https://example.com/one',
      kind: 'video',
      linkedEntityIds: ['e1'],
      linkedPracticeIds: ['p1'],
      linkedEventIds: ['ev1'],
      linkedTextIds: ['t1'],
      tags: ['tag1']
    },
    {
      id: 'mda2',
      movementId: 'm1',
      title: 'Media Two',
      uri: 'https://example.com/two',
      kind: 'image',
      linkedEntityIds: [],
      linkedPracticeIds: [],
      linkedEventIds: [],
      linkedTextIds: []
    },
    {
      id: 'mda3',
      movementId: 'm2',
      title: 'Media Three',
      uri: 'https://example.com/three',
      kind: 'audio',
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
    { snapshot: mediaSnapshot }
  );
});

test('renders media tab and filters by entity', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  await expect(page.locator('#fatal-import-error:not(.hidden)')).toHaveCount(0);

  const cards = page.locator('#media-gallery .card');
  await expect(cards).toHaveCount(2);

  await page.selectOption('#media-entity-filter', 'e1');
  await expect(cards).toHaveCount(1);
});

test('switching movements updates media view', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  const cards = page.locator('#media-gallery .card');
  await expect(cards).toHaveCount(2);

  await page.locator('#movement-list li').filter({ hasText: 'Two' }).click();
  await expect(cards).toHaveCount(1);
});

test('shows empty-state when movement has no media', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Media' }).click();

  await page.locator('#movement-list li').filter({ hasText: 'Empty' }).click();

  await expect(page.locator('#media-gallery')).toContainText('No media match this filter.');
});
