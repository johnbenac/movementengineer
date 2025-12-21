import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <div id="calendar-view"></div>
    <select id="calendar-recurrence-filter">
      <option value="">All</option>
      <option value="weekly">weekly</option>
    </select>
    <button class="tab active" data-tab="calendar"></button>
  `;
}

function createCtx(snapshot, calendarVm, currentMovementId = 'm1') {
  const clearElement = el => {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  };
  const ViewModels = {
    buildCalendarViewModel: vi.fn(() => calendarVm)
  };
  const actions = {
    jumpToPractice: vi.fn(),
    jumpToEntity: vi.fn(),
    jumpToText: vi.fn()
  };
  return {
    getState: () => ({ snapshot, currentMovementId }),
    services: { ViewModels },
    dom: { clearElement },
    actions,
    subscribe: () => () => {}
  };
}

describe('calendar tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
  });

  it('renders event cards and wires navigation chips', async () => {
    renderDom();
    const snapshot = { events: [] };
    const vm = {
      events: [
        {
          id: 'ev1',
          name: 'Weekly Meetup',
          description: 'Description',
          recurrence: 'weekly',
          timingRule: 'Mondays',
          tags: ['community'],
          mainPractices: [{ id: 'p1', name: 'Practice' }],
          mainEntities: [{ id: 'e1', name: 'Entity' }],
          readings: [{ id: 't1', title: 'Text' }],
          supportingClaims: [{ id: 'c1', text: 'Claim text', category: 'cat' }]
        }
      ]
    };
    const ctx = createCtx(snapshot, vm);
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    const card = document.querySelector('#calendar-view .card');
    expect(card.textContent).toContain('Weekly Meetup');
    expect(ctx.services.ViewModels.buildCalendarViewModel).toHaveBeenCalledWith(snapshot, {
      movementId: 'm1',
      recurrenceFilter: []
    });

    card.querySelector('.chip.clickable')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    card.querySelector('.chip-entity.clickable')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    const readingChip = Array.from(card.querySelectorAll('.chip.clickable')).find(
      el => el.textContent === 'Text'
    );
    readingChip?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables the filter and shows a hint when no movement is selected', async () => {
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

  it('shows empty state when no events match the filter', async () => {
    renderDom();
    const snapshot = { events: [] };
    const vm = { events: [] };
    const ctx = createCtx(snapshot, vm);
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-view').textContent).toContain(
      'No events in the calendar'
    );
  });
});
