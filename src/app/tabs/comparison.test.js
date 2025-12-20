import { beforeEach, describe, expect, it, vi } from 'vitest';

function createSnapshot() {
  return {
    version: '2.3',
    specVersion: '2.3',
    movements: [
      { id: 'm1', movementId: 'm1', name: 'One' },
      { id: 'm2', movementId: 'm2', name: 'Two' }
    ]
  };
}

function renderDom() {
  document.body.innerHTML = `
    <div id="comparison-selector"></div>
    <div id="comparison-table-wrapper"></div>
  `;
}

function createCtx(snapshot) {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ViewModels = {
    buildComparisonViewModel: vi.fn((data, { movementIds }) => {
      const rows = movementIds.map(id => ({
        movement: data.movements.find(m => m.id === id),
        textCounts: { totalTexts: 1, rootCount: 1, maxDepth: 0 },
        entityCounts: { total: 0, byKind: null },
        practiceCounts: { total: 0, byKind: null },
        eventCounts: { total: 0, byRecurrence: null },
        ruleCount: 0,
        claimCount: 0
      }));
      return { rows };
    })
  };
  return {
    store: { getState: () => ({ snapshot }) },
    services: { ViewModels },
    dom: { clearElement }
  };
}

async function setup() {
  vi.resetModules();
  renderDom();
  window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  const { registerComparisonTab } = await import('./comparison.js');
  const snapshot = createSnapshot();
  const ctx = createCtx(snapshot);
  const tab = registerComparisonTab(ctx);
  return { tab, ctx };
}

describe('comparison tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders checkboxes and comparison table headers', async () => {
    const { tab, ctx } = await setup();

    tab.render(ctx);

    const checkboxes = document.querySelectorAll('#comparison-selector input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    const headerCells = Array.from(
      document.querySelectorAll('#comparison-table-wrapper table tr:first-child th')
    ).map(cell => cell.textContent);
    expect(headerCells).toEqual(['Metric', 'One', 'Two']);
  });

  it('re-renders the table when selections change', async () => {
    const { tab, ctx } = await setup();
    tab.render(ctx);

    const checkboxes = document.querySelectorAll('#comparison-selector input[type="checkbox"]');
    checkboxes[1].checked = false;
    checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));

    const headerCells = Array.from(
      document.querySelectorAll('#comparison-table-wrapper table tr:first-child th')
    ).map(cell => cell.textContent);
    expect(headerCells).toEqual(['Metric', 'One']);
  });
});
