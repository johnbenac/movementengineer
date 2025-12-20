import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerComparisonTab } from './comparison.js';

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

describe('comparison tab module', () => {
  let ctx;
  let snapshot;
  let viewModelStub;

  beforeEach(() => {
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    document.body.innerHTML = `
      <div id="comparison-selector"></div>
      <div id="comparison-table-wrapper"></div>
    `;
    snapshot = {
      movements: [
        { id: 'm1', name: 'One' },
        { id: 'm2', name: 'Two' }
      ]
    };
    viewModelStub = vi.fn((data, { movementIds }) => ({
      rows: movementIds.map(id => ({
        movement: data.movements.find(movement => movement.id === id),
        textCounts: { totalTexts: 1, rootCount: 1, maxDepth: 0 },
        entityCounts: { total: 0, byKind: {} },
        practiceCounts: { total: 0, byKind: {} },
        eventCounts: { total: 0, byRecurrence: {} },
        ruleCount: 0,
        claimCount: 0
      }))
    }));

    ctx = {
      store: { getState: () => ({ snapshot }) },
      services: { ViewModels: { buildComparisonViewModel: viewModelStub } },
      dom: { clearElement }
    };

    registerComparisonTab(ctx);
  });

  it('renders movement selectors and comparison table headers', () => {
    const tab = window.MovementEngineer.tabs.comparison;
    tab.render(ctx);

    const checkboxes = document.querySelectorAll('#comparison-selector input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);

    const headers = Array.from(
      document.querySelectorAll('#comparison-table-wrapper th')
    ).map(el => el.textContent);
    expect(headers[0]).toBe('Metric');
    expect(headers).toContain('One');
    expect(headers).toContain('Two');
  });

  it('re-renders table when selections change', () => {
    const tab = window.MovementEngineer.tabs.comparison;
    tab.render(ctx);

    const checkboxes = document.querySelectorAll('#comparison-selector input[type="checkbox"]');
    checkboxes[1].checked = false;
    checkboxes[1].dispatchEvent(new Event('change', { bubbles: true }));

    const headerCells = Array.from(
      document.querySelectorAll('#comparison-table-wrapper tr:first-child th')
    ).map(el => el.textContent);
    expect(headerCells).toEqual(['Metric', 'One']);

    expect(viewModelStub).toHaveBeenCalledTimes(2);
    expect(viewModelStub.mock.calls[1][1].movementIds).toEqual(['m1']);
  });
});
