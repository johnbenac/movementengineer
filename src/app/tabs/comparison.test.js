import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerComparisonTab, renderComparisonTab } from './comparison.js';

describe('comparison tab module', () => {
  const snapshot = {
    movements: [
      { id: 'm1', name: 'One' },
      { id: 'm2', name: 'Two' }
    ]
  };

  const buildRow = movement => ({
    movement,
    textCounts: { totalTexts: movement.id === 'm1' ? 1 : 2, rootCount: 1, maxDepth: 0 },
    entityCounts: { total: 0, byKind: {} },
    practiceCounts: { total: 0, byKind: {} },
    eventCounts: { total: 0, byRecurrence: {} },
    ruleCount: 0,
    claimCount: 0
  });

  let ctx;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="comparison-selector"></div>
      <div id="comparison-table-wrapper"></div>
    `;

    window.MovementEngineer = { tabs: {} };

    const ViewModels = {
      buildComparisonViewModel: vi.fn((state, { movementIds }) => ({
        rows: movementIds.map(id => {
          const movement = snapshot.movements.find(m => m.id === id);
          return movement ? buildRow(movement) : null;
        }).filter(Boolean)
      }))
    };

    ctx = {
      store: { getState: () => ({ snapshot }) },
      services: { ViewModels },
      dom: {
        clearElement: el => {
          if (!el) return;
          while (el.firstChild) el.removeChild(el.firstChild);
        }
      }
    };

    registerComparisonTab(ctx);
  });

  it('renders comparison selector and table for movements', () => {
    renderComparisonTab(ctx);

    const checkboxes = document.querySelectorAll('#comparison-selector input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);

    const headerCells = document.querySelectorAll('#comparison-table-wrapper tr:first-child th');
    expect(headerCells[0].textContent).toBe('Metric');
    expect(headerCells[1].textContent).toBe('One');
    expect(headerCells[2].textContent).toBe('Two');

    expect(ctx.services.ViewModels.buildComparisonViewModel).toHaveBeenCalledWith(snapshot, {
      movementIds: ['m1', 'm2']
    });
  });

  it('rerenders table when a movement is toggled', () => {
    renderComparisonTab(ctx);
    ctx.services.ViewModels.buildComparisonViewModel.mockClear();

    const firstCheckbox = document.querySelector('#comparison-selector input[value="m1"]');
    firstCheckbox.checked = false;
    firstCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

    const headerCells = document.querySelectorAll('#comparison-table-wrapper tr:first-child th');
    expect(headerCells).toHaveLength(2);
    expect(headerCells[1].textContent).toBe('Two');

    expect(ctx.services.ViewModels.buildComparisonViewModel).toHaveBeenCalledWith(snapshot, {
      movementIds: ['m2']
    });
  });
});
