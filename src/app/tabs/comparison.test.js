import { describe, expect, it, beforeEach } from 'vitest';
import { registerComparisonTab } from './comparison.js';

function createDomUtils() {
  return {
    clearElement(el) {
      if (!el) return;
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    }
  };
}

describe('comparison tab module', () => {
  const snapshot = {
    movements: [
      { id: 'm1', name: 'One' },
      { id: 'm2', name: 'Two' }
    ]
  };

  const ViewModels = {
    buildComparisonViewModel: (snap, { movementIds }) => ({
      rows: (snap.movements || [])
        .filter(m => movementIds.includes(m.id))
        .map(m => ({
          movement: m,
          textCounts: { totalTexts: 1, rootCount: 1, maxDepth: 0 },
          entityCounts: { total: 0 },
          practiceCounts: { total: 0 },
          eventCounts: { total: 0 },
          ruleCount: 0,
          claimCount: 0
        }))
    })
  };

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="comparison-selector"></div>
      <div id="comparison-table-wrapper"></div>
    `;

    window.MovementEngineer = { tabs: {} };
  });

  it('renders the selector and comparison table', () => {
    const ctx = {
      store: { getState: () => ({ snapshot }) },
      services: { ViewModels },
      dom: createDomUtils()
    };

    registerComparisonTab(ctx);

    const tab = window.MovementEngineer.tabs.comparison;
    tab.render();

    const checkboxes = document.querySelectorAll('.cmp-rel');
    expect(checkboxes).toHaveLength(2);
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(true);

    const headers = Array.from(
      document.querySelectorAll('#comparison-table-wrapper table tr:first-child th')
    ).map(th => th.textContent);
    expect(headers).toEqual(['Metric', 'One', 'Two']);
  });

  it('re-renders the table when selection changes', () => {
    const ctx = {
      store: { getState: () => ({ snapshot }) },
      services: { ViewModels },
      dom: createDomUtils()
    };

    registerComparisonTab(ctx);

    const tab = window.MovementEngineer.tabs.comparison;
    tab.render();

    const secondCheckbox = document.querySelector('.cmp-rel[value="m2"]');
    secondCheckbox.checked = false;
    secondCheckbox.dispatchEvent(new Event('change'));

    const headers = Array.from(
      document.querySelectorAll('#comparison-table-wrapper table tr:first-child th')
    ).map(th => th.textContent);
    expect(headers).toEqual(['Metric', 'One']);
  });
});
