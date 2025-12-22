import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../../src/app/ui/dom.js';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="calendar"></button>
    <select id="calendar-recurrence-filter">
      <option value="">All</option>
      <option value="weekly">weekly</option>
    </select>
    <div id="calendar-view"></div>
  `;
}

function createCtx(vm, currentMovementId = 'm1') {
  let subscriber = null;
  const ViewModels = {
    buildCalendarViewModel: vi.fn(() => vm)
  };
  const store = {
    getState: () => ({ snapshot: {}, currentMovementId })
  };
  return {
    store,
    getState: store.getState,
    services: { ViewModels },
    dom: createDomUtils(),
    actions: {
      jumpToPractice: vi.fn(),
      jumpToEntity: vi.fn(),
      jumpToText: vi.fn()
    },
    subscribe: fn => {
      subscriber = fn;
      return vi.fn();
    },
    get subscriber() {
      return subscriber;
    }
  };
}

describe('calendar tab module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.MovementEngineer = { tabs: {}, bootstrapOptions: {} };
    renderDom();
  });

  it('renders events and wires navigation chips', async () => {
    const vm = {
      events: [
        {
          id: 'ev1',
          name: 'Weekly Service',
          recurrence: 'weekly',
          timingRule: 'Sundays 10am',
          description: 'Gathering',
          tags: ['community'],
          mainPractices: [{ id: 'p1', name: 'Worship' }],
          mainEntities: [{ id: 'e1', name: 'Choir' }],
          readings: [{ id: 't1', title: 'Psalm 23' }],
          supportingClaims: [{ id: 'c1', text: 'Claim text', category: 'value' }]
        }
      ]
    };
    const ctx = createCtx(vm);
    const select = document.getElementById('calendar-recurrence-filter');
    select.value = 'weekly';

    const { registerCalendarTab } = await import('../../../../src/app/tabs/calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);

    expect(ctx.services.ViewModels.buildCalendarViewModel).toHaveBeenCalledWith(
      {},
      { movementId: 'm1', recurrenceFilter: ['weekly'] }
    );
    expect(document.querySelector('#calendar-view .card h4').textContent).toBe('Weekly Service');

    const practiceChip = document.querySelector('#calendar-view .chip.clickable');
    practiceChip?.dispatchEvent(new Event('click', { bubbles: true }));

    const entityChip = document.querySelector('#calendar-view .chip-entity.clickable');
    entityChip?.dispatchEvent(new Event('click', { bubbles: true }));

    const readingChip = Array.from(
      document.querySelectorAll('#calendar-view .chip.clickable')
    ).find(el => el.textContent === 'Psalm 23');
    readingChip?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables controls and shows hint when no movement is selected', async () => {
    const vm = { events: [] };
    const ctx = createCtx(vm, null);
    const { registerCalendarTab } = await import('../../../../src/app/tabs/calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-recurrence-filter').disabled).toBe(true);
    expect(document.getElementById('calendar-view').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('shows empty state when no events match', async () => {
    const vm = { events: [] };
    const ctx = createCtx(vm);
    const { registerCalendarTab } = await import('../../../../src/app/tabs/calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-view').textContent).toContain(
      'No events in the calendar for this filter.'
    );
  });

  it('rerenders on state change when active', async () => {
    const vm = { events: [] };
    const ctx = createCtx(vm);
    const { registerCalendarTab } = await import('../../../../src/app/tabs/calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.mount(ctx);
    tab.render(ctx);
    ctx.services.ViewModels.buildCalendarViewModel.mockClear();

    ctx.subscriber?.();

    expect(ctx.services.ViewModels.buildCalendarViewModel).toHaveBeenCalledTimes(1);
  });
});
