import { beforeEach, describe, expect, it, vi } from 'vitest';

function renderDom() {
  document.body.innerHTML = `
    <button class="tab active" data-tab="calendar"></button>
    <select id="calendar-recurrence-filter">
      <option value="">All</option>
      <option value="weekly">Weekly</option>
    </select>
    <div id="calendar-view"></div>
  `;
}

function createCtx({ movementId = null, snapshot = {}, actions = {}, viewModels } = {}) {
  let subscriber = null;
  const state = { currentMovementId: movementId, snapshot };
  return {
    getState: () => state,
    services: {
      ViewModels: viewModels
    },
    actions,
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

  it('shows hint and disables filter when no movement is selected', async () => {
    const ctx = createCtx();
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-recurrence-filter')?.disabled).toBe(true);
    expect(document.getElementById('calendar-view')?.textContent).toContain(
      'Create or select a movement'
    );
  });

  it('renders events and wires jump actions', async () => {
    const jumpToPractice = vi.fn();
    const jumpToEntity = vi.fn();
    const jumpToText = vi.fn();
    const viewModels = {
      buildCalendarViewModel: vi.fn().mockReturnValue({
        events: [
          {
            name: 'Test Event',
            recurrence: 'weekly',
            timingRule: 'Mondays',
            description: 'desc',
            tags: ['t1'],
            mainPractices: [{ id: 'p1', name: 'Practice' }],
            mainEntities: [{ id: 'e1', name: 'Entity' }],
            readings: [{ id: 'txt1', title: 'Text' }],
            supportingClaims: [{ id: 'c1', category: 'cat', text: 'claim' }]
          }
        ]
      })
    };
    const ctx = createCtx({
      movementId: 'm1',
      snapshot: {},
      actions: { jumpToPractice, jumpToEntity, jumpToText },
      viewModels
    });
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    const content = document.getElementById('calendar-view')?.textContent || '';
    expect(content).toContain('Test Event');
    expect(content).toContain('weekly');
    expect(content).toContain('Mondays');
    expect(content).toContain('desc');
    expect(content).toContain('Practices:');
    expect(content).toContain('Entities:');
    expect(content).toContain('Readings:');
    expect(content).toContain('Supporting claims:');

    document.querySelector('.chip.clickable')?.dispatchEvent(new Event('click'));
    document.querySelector('.chip-entity.clickable')?.dispatchEvent(new Event('click'));
    const readingChip = Array.from(document.querySelectorAll('.chip.clickable')).find(
      el => el.textContent === 'Text'
    );
    readingChip?.dispatchEvent(new Event('click'));

    expect(jumpToPractice).toHaveBeenCalledWith('p1');
    expect(jumpToEntity).toHaveBeenCalledWith('e1');
    expect(jumpToText).toHaveBeenCalledWith('txt1');
  });

  it('rerenders when subscribed state changes while active', async () => {
    const viewModels = {
      buildCalendarViewModel: vi.fn().mockReturnValue({ events: [] })
    };
    const ctx = createCtx({ movementId: 'm1', snapshot: {}, viewModels });
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);
    const renderSpy = vi.spyOn(tab, 'render');

    tab.mount(ctx);
    ctx.subscriber?.();

    expect(renderSpy).toHaveBeenCalled();
  });

  it('shows message when view models are unavailable', async () => {
    const ctx = createCtx({ movementId: 'm1', snapshot: {}, viewModels: null });
    const { registerCalendarTab } = await import('./calendar.js');
    const tab = registerCalendarTab(ctx);

    tab.render(ctx);

    expect(document.getElementById('calendar-view')?.textContent).toContain(
      'ViewModels module not loaded.'
    );
  });
});
