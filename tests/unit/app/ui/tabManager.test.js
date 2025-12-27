import { describe, expect, it, beforeEach } from 'vitest';
import { createTabManager } from '../../../../src/app/ui/tabManager.js';

function renderDom() {
  document.body.innerHTML = `
    <nav id="tabs-nav" class="tabs">
      <div id="tool-tabs" class="tab-group"></div>
      <div id="collection-tabs" class="tab-group"></div>
    </nav>
    <div id="tool-panels"></div>
    <div id="collection-panels"></div>
  `;
}

describe('tabManager', () => {
  beforeEach(() => {
    renderDom();
  });

  it('creates tab buttons and panels in the correct group', () => {
    const manager = createTabManager({});

    manager.ensureTab({ id: 'notes', label: 'Notes', group: 'collection' });
    manager.ensureTab({ id: 'dashboard', label: 'Dashboard', group: 'tool' });

    expect(document.querySelector('[data-tab="notes"]')).toBeTruthy();
    expect(document.querySelector('#collection-panels #tab-notes')).toBeTruthy();
    expect(document.querySelector('[data-tab="dashboard"]')).toBeTruthy();
    expect(document.querySelector('#tool-panels #tab-dashboard')).toBeTruthy();
    manager.destroy();
  });

  it('marks the active tab and panel', () => {
    const manager = createTabManager({});

    manager.ensureTab({ id: 'notes', label: 'Notes', group: 'collection' });
    manager.ensureTab({ id: 'dashboard', label: 'Dashboard', group: 'tool' });
    manager.setActiveTab('notes');

    expect(document.querySelector('[data-tab="notes"]').classList.contains('active')).toBe(true);
    expect(document.querySelector('#tab-notes').classList.contains('active')).toBe(true);
    expect(document.querySelector('[data-tab="dashboard"]').classList.contains('active')).toBe(
      false
    );
    manager.destroy();
  });
});
