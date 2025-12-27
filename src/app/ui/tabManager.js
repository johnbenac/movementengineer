function getTabNameFromEl(el) {
  if (!el) return null;
  const ds = el.dataset || {};
  return ds.tab || ds.tabName || ds.name || ds.target || ds.panel || null;
}

function resolveContainer(idOrSelector, fallbackSelector) {
  if (idOrSelector) {
    if (idOrSelector.startsWith('#') || idOrSelector.startsWith('.')) {
      const bySelector = document.querySelector(idOrSelector);
      if (bySelector) return bySelector;
    } else {
      const byId = document.getElementById(idOrSelector);
      if (byId) return byId;
    }
  }
  if (fallbackSelector) {
    return document.querySelector(fallbackSelector);
  }
  return null;
}

export function createTabManager(ctx, options = {}) {
  const tabSelector = options.tabSelector || '.tab';
  const panelSelector = options.panelSelector || '.tab-panel';
  const navSelector = options.navSelector || '#tabs-nav';
  const toolTabsContainerId = options.toolTabsContainerId || 'tool-tabs';
  const collectionTabsContainerId = options.collectionTabsContainerId || 'collection-tabs';
  const toolPanelsContainerId = options.toolPanelsContainerId || 'tool-panels';
  const collectionPanelsContainerId = options.collectionPanelsContainerId || 'collection-panels';

  const registry = new Map();
  const groups = new Map();

  function ensureGroupIndex(group) {
    if (!groups.has(group)) {
      groups.set(group, new Set());
    }
    return groups.get(group);
  }

  function getTabs() {
    return Array.from(document.querySelectorAll(tabSelector));
  }

  function getPanels() {
    return Array.from(document.querySelectorAll(panelSelector));
  }

  function getActiveTabId() {
    const active = document.querySelector(`${tabSelector}.active`);
    return getTabNameFromEl(active);
  }

  function getDefaultTabId() {
    const active = getActiveTabId();
    if (active) return active;
    const hash = window.location.hash?.replace(/^#/, '');
    if (hash && document.querySelector(`${tabSelector}[data-tab="${hash}"]`)) {
      return hash;
    }
    const first = getTabs()[0];
    return getTabNameFromEl(first);
  }

  function setActiveTab(id) {
    if (!id) return;
    const tabs = getTabs();
    const panels = getPanels();

    tabs.forEach(tabEl => {
      const name = getTabNameFromEl(tabEl);
      const isActive = name === id;
      tabEl.classList.toggle('active', isActive);
      tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tabEl.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach(panelEl => {
      const panelName =
        panelEl.dataset?.tabPanel ||
        panelEl.dataset?.tab ||
        panelEl.dataset?.name ||
        panelEl.id?.replace(/^tab-/, '') ||
        null;
      const isActive = panelName === id;
      panelEl.classList.toggle('active', isActive);
    });
  }

  function ensureTab({ id, label, group = 'collection' } = {}) {
    if (!id) return null;

    const entry = registry.get(id) || { id, group };
    const tabGroup = ensureGroupIndex(group);
    tabGroup.add(id);

    const tabsContainer =
      group === 'tool'
        ? resolveContainer(toolTabsContainerId, '#tool-tabs')
        : resolveContainer(collectionTabsContainerId, '#collection-tabs');
    const panelsContainer =
      group === 'tool'
        ? resolveContainer(toolPanelsContainerId, '#tool-panels')
        : resolveContainer(collectionPanelsContainerId, '#collection-panels');

    let tabEl = document.querySelector(`${tabSelector}[data-tab="${id}"]`);
    if (!tabEl) {
      tabEl = document.createElement('button');
      tabEl.type = 'button';
      tabEl.className = 'tab';
      tabEl.dataset.tab = id;
      tabEl.textContent = label || id;
      if (tabsContainer) {
        tabsContainer.appendChild(tabEl);
      }
    } else if (label) {
      tabEl.textContent = label;
    }

    let panelEl =
      document.getElementById(`tab-${id}`) ||
      document.querySelector(`${panelSelector}[data-tab-panel="${id}"]`);
    if (!panelEl) {
      panelEl = document.createElement('section');
      panelEl.id = `tab-${id}`;
      panelEl.className = 'tab-panel';
      panelEl.dataset.tabPanel = id;
      const body = document.createElement('div');
      body.className = 'panel-body';
      body.dataset.tabBody = id;
      panelEl.appendChild(body);
      if (panelsContainer) {
        panelsContainer.appendChild(panelEl);
      }
    } else if (panelsContainer && panelEl.parentElement !== panelsContainer) {
      panelsContainer.appendChild(panelEl);
    }

    if (panelEl && !panelEl.querySelector('.panel-body')) {
      const body = document.createElement('div');
      body.className = 'panel-body';
      body.dataset.tabBody = id;
      panelEl.appendChild(body);
    }

    entry.tabEl = tabEl;
    entry.panelEl = panelEl;
    registry.set(id, entry);
    return entry;
  }

  function getPanelEl(id) {
    if (!id) return null;
    return (
      document.getElementById(`tab-${id}`) ||
      document.querySelector(`${panelSelector}[data-tab-panel="${id}"]`)
    );
  }

  function getPanelBodyEl(id) {
    const panel = getPanelEl(id);
    if (!panel) return null;
    let body = panel.querySelector('.panel-body');
    if (!body) {
      body = document.createElement('div');
      body.className = 'panel-body';
      body.dataset.tabBody = id;
      panel.appendChild(body);
    }
    return body;
  }

  function removeTab(id) {
    if (!id) return;
    const entry = registry.get(id);
    const tabEl =
      entry?.tabEl || document.querySelector(`${tabSelector}[data-tab="${id}"]`);
    const panelEl = entry?.panelEl || getPanelEl(id);
    if (tabEl?.parentElement) tabEl.parentElement.removeChild(tabEl);
    if (panelEl?.parentElement) panelEl.parentElement.removeChild(panelEl);
    registry.delete(id);
    groups.forEach(set => set.delete(id));
  }

  function getTabsByGroup(group) {
    return Array.from(groups.get(group) || []);
  }

  function handleClick(event) {
    const navRoot = resolveContainer(navSelector, '.tabs');
    if (navRoot && !navRoot.contains(event.target)) return;
    const tabEl = event.target?.closest?.(tabSelector);
    if (!tabEl) return;
    const name = getTabNameFromEl(tabEl);
    if (!name) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveTab(name);
    ctx?.shell?.renderActiveTab?.();
  }

  document.addEventListener('click', handleClick, true);

  const api = {
    ensureTab,
    removeTab,
    setActiveTab,
    getDefaultTabId,
    getPanelEl,
    getPanelBodyEl,
    getTabsByGroup,
    getActiveTabId,
    handlesClicks: true,
    destroy() {
      document.removeEventListener('click', handleClick, true);
    }
  };

  return api;
}
