import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDomUtils } from '../../../src/app/ui/dom.js';
import { EventsCalendarView } from '../../../src/plugins/builtins/views/eventsCalendarView.js';

function renderDom() {
  document.body.innerHTML = '<div id="root"></div>';
}

function createCtx(vm, currentMovementId = 'm1') {
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
    }
  };
}

describe('EventsCalendarView', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    renderDom();
  });

  it('renders events and wires navigation chips', () => {
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
    window.MovementEngineer = { ctx, bootstrapOptions: {} };
    ctx.dom.installGlobalChipHandler(ctx);

    const view = EventsCalendarView({
      snapshot: {},
      collectionName: 'events',
      setSelectedId: vi.fn(),
      openEditor: vi.fn()
    });

    document.getElementById('root').appendChild(view);

    expect(ctx.services.ViewModels.buildCalendarViewModel).toHaveBeenCalledWith(
      {},
      { movementId: 'm1', recurrenceFilter: [] }
    );
    expect(document.querySelector('.card h4')?.textContent).toBe('Weekly Service');

    const practiceChip = document.querySelector('.chip.clickable');
    practiceChip?.dispatchEvent(new Event('click', { bubbles: true }));

    const entityChip = document.querySelector('.chip-entity.clickable');
    entityChip?.dispatchEvent(new Event('click', { bubbles: true }));

    const readingChip = Array.from(document.querySelectorAll('.chip.clickable')).find(
      el => el.textContent === 'Psalm 23'
    );
    readingChip?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(ctx.actions.jumpToPractice).toHaveBeenCalledWith('p1');
    expect(ctx.actions.jumpToEntity).toHaveBeenCalledWith('e1');
    expect(ctx.actions.jumpToText).toHaveBeenCalledWith('t1');
  });

  it('disables controls and shows hint when no movement is selected', () => {
    const vm = { events: [] };
    const ctx = createCtx(vm, null);
    window.MovementEngineer = { ctx, bootstrapOptions: {} };

    const view = EventsCalendarView({
      snapshot: {},
      collectionName: 'events',
      setSelectedId: vi.fn(),
      openEditor: vi.fn()
    });

    document.getElementById('root').appendChild(view);

    const select = document.querySelector('select');
    const button = document.querySelector('button');
    expect(select.disabled).toBe(true);
    expect(button.disabled).toBe(true);
    expect(document.getElementById('root').textContent).toContain(
      'Create or select a movement'
    );
  });

  it('shows empty state when no events match', () => {
    const vm = { events: [] };
    const ctx = createCtx(vm);
    window.MovementEngineer = { ctx, bootstrapOptions: {} };

    const view = EventsCalendarView({
      snapshot: {},
      collectionName: 'events',
      setSelectedId: vi.fn(),
      openEditor: vi.fn()
    });

    document.getElementById('root').appendChild(view);

    expect(document.getElementById('root').textContent).toContain(
      'No events in the calendar for this filter.'
    );
  });
});
