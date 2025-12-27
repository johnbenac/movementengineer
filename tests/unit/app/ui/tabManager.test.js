import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTabManager } from '../../../../src/app/ui/tabManager.js';

describe('tabManager', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="tabs-nav">
        <div id="tool-tabs"></div>
        <div id="collection-tabs"></div>
      </nav>
      <main>
        <div id="tool-panels"></div>
        <div id="collection-panels"></div>
      </main>
    `;
  });

  it('creates tab buttons and panels for tool and collection groups', () => {
    const ctx = { shell: { renderActiveTab: vi.fn() } };
    const tabManager = createTabManager(ctx);

    tabManager.ensureTab({ id: 'dashboard', label: 'Dashboard', group: 'tool' });
    tabManager.ensureTab({ id: 'notes', label: 'Notes', group: 'collection' });

    expect(document.querySelector('#tool-tabs .tab[data-tab="dashboard"]')).not.toBeNull();
    expect(document.querySelector('#collection-tabs .tab[data-tab="notes"]')).not.toBeNull();

    const dashboardBody = tabManager.getPanelBodyEl('dashboard');
    const notesBody = tabManager.getPanelBodyEl('notes');
    expect(dashboardBody?.dataset?.tabBody).toBe('dashboard');
    expect(notesBody?.dataset?.tabBody).toBe('notes');

    expect(document.querySelector('#tool-panels #tab-dashboard')).not.toBeNull();
    expect(document.querySelector('#collection-panels #tab-notes')).not.toBeNull();
  });
});
