import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div class="tab active" data-tab="calendar"></div>
    <select id="calendar-recurrence-filter">
      <option value="">All</option>
      <option value="weekly">Weekly</option>
    </select>
    <div id="calendar-view"></div>
  `;
}

function createCtx(snapshot, vm, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ViewModels = {
    buildCalendarViewModel: vi.fn(() => vm)
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement },
    actions: {
      jumpToPractice: vi.fn(),
      jumpToEntity: vi.fn(),
      jumpToText: vi.fn()
    },
    subscribe: () => () => {}
  };
}

describe('calendar tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders events and wires navigation chips', async () => {
    renderDom();
    document.getElementById('calendar-recurrence-filter').value = 'weekly';
    const snapshot = { events: [] };
    const vm = {
      events: [
        {
          id: 'ev1',
          name: 'Weekly Study',
          recurrence: 'weekly',
          timingRule: 'Mondays',
          description: 'desc',
          tags: ['tag1'],
          mainPractices: [{ id: 'p1', name: 'Practice One' }],
          mainEntities: [{ id: 'e1', name: 'Entity One' }],
          readings: [{ id: 't1', title: 'Reading One' }],
          supportingClaims: [{ id: 'c1', text: 'Claim text', category: 'cat' }]
        }
      ]
    };
    const ctx = createCtx(snapshot, vm);
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    const detail = document.getElementById('calendar-view');
    expect(detail.textContent).toContain('Weekly Study');
    expect(detail.textContent).toContain('desc');
    expect(detail.querySelectorAll('.chip').length).toBeGreaterThan(0);
    expect(ctx.services.ViewModels.buildCalendarViewModel).toHaveBeenCalledWith(
      snapshot,
      expect.objectContaining({ movementId: 'm1', recurrenceFilter: ['weekly'] })
    );

    const clickableChips = detail.querySelectorAll('.chip.clickable:not(.chip-entity)');
    clickableChips[0].dispatchEvent(new Event('click', { bubbles: true }));
    detail
      .querySelector('.chip-entity.clickable')
      .dispatchEvent(new Event('click', { bubbles: true }));
    clickableChips[1].dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    renderDom();
    const snapshot = { events: [] };
    const vm = { events: [] };
    const ctx = createCtx(snapshot, vm, null);
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-recurrence-filter').disabled).toBe(true);
    expect(document.getElementById('calendar-view').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('shows empty state when no events exist for the filter', async () => {
    renderDom();
    const snapshot = { events: [] };
    const vm = { events: [] };
    const ctx = createCtx(snapshot, vm);
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-recurrence-filter').disabled).toBe(false);
    expect(document.getElementById('calendar-view').textContent).toContain(
      'No events in the calendar for this filter.'
    );
  });
});
