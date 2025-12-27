export function createTabManager(ctx, options = {}) {
  const nav = document.querySelector(options.navSelector || '#tabs-nav') || document;
  const toolTabContainer =
    document.getElementById('tool-tabs') || nav.querySelector('#tool-tabs');
  const collectionTabContainer =
    document.getElementById('collection-tabs') || nav.querySelector('#collection-tabs');
  const toolPanelContainer = document.getElementById('tool-panels');
  const collectionPanelContainer = document.getElementById('collection-panels');
  const tabSelector = options.tabSelector || '.tab';
  const panelSelector = options.panelSelector || '.tab-panel';
  const activeClass = options.activeClass || 'active';

  if (!toolTabContainer || !collectionTabContainer) {
    throw new Error('TabManager: missing #tool-tabs or #collection-tabs');
  }
  if (!toolPanelContainer || !collectionPanelContainer) {
    throw new Error('TabManager: missing #tool-panels or #collection-panels');
  }

  function getGroupConfig(group) {
    return group === 'tool'
      ? {
          tabContainer: toolTabContainer,
          panelContainer: toolPanelContainer
        }
      : {
          tabContainer: collectionTabContainer,
          panelContainer: collectionPanelContainer
        };
  }

  function ensurePanelBody(panel, id) {
    let body = panel.querySelector('[data-tab-body]');
    if (!body) {
      body = panel.querySelector('.panel-body');
    }
    if (!body) {
      body = document.createElement('div');
      body.className = 'panel-body';
      panel.appendChild(body);
    }
    body.dataset.tabBody = id;
    return body;
  }

  function ensureTab({ id, label, group = 'collection' }) {
    if (!id) throw new Error('TabManager.ensureTab: id is required');
    const { tabContainer, panelContainer } = getGroupConfig(group);

    let tabButton = tabContainer.querySelector(`${tabSelector}[data-tab="${id}"]`);
    if (!tabButton) {
      tabButton = document.createElement('button');
      tabButton.type = 'button';
      tabButton.className = 'tab';
      tabButton.dataset.tab = id;
      tabButton.textContent = label || id;
      tabButton.id = `tab-${id}-tab`;
      tabButton.setAttribute('aria-controls', `tab-${id}`);
      tabContainer.appendChild(tabButton);
    } else if (label) {
      tabButton.textContent = label;
    }

    let panel = document.getElementById(`tab-${id}`);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = `tab-${id}`;
      panel.className = 'tab-panel';
      panelContainer.appendChild(panel);
    } else if (!panel.classList.contains('tab-panel')) {
      panel.classList.add('tab-panel');
    }

    panel.setAttribute('aria-labelledby', tabButton.id);
    ensurePanelBody(panel, id);

    return { tabButton, panel };
  }

  function getTabs() {
    return Array.from(document.querySelectorAll(`${tabSelector}[data-tab]`));
  }

  function getPanels() {
    return Array.from(document.querySelectorAll(panelSelector));
  }

  function getActiveTabId() {
    const active = document.querySelector(`${tabSelector}.${activeClass}[data-tab]`);
    return active?.dataset?.tab || null;
  }

  function setActiveTab(id) {
    if (!id) return;
    const tabs = getTabs();
    const panels = getPanels();
    tabs.forEach(tabEl => {
      const isActive = tabEl.dataset.tab === id;
      tabEl.classList.toggle(activeClass, isActive);
      tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tabEl.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach(panelEl => {
      const isActive = panelEl.id === `tab-${id}`;
      panelEl.classList.toggle(activeClass, isActive);
    });
  }

  function getPanelBodyEl(id) {
    if (!id) return null;
    const panel = document.getElementById(`tab-${id}`);
    if (!panel) return null;
    const body =
      panel.querySelector(`[data-tab-body="${id}"]`) ||
      panel.querySelector('[data-tab-body]') ||
      panel.querySelector('.panel-body');
    if (body) {
      body.dataset.tabBody = id;
      return body;
    }
    return ensurePanelBody(panel, id);
  }

  function clearGroup(group) {
    const { tabContainer, panelContainer } = getGroupConfig(group);
    while (tabContainer.firstChild) {
      tabContainer.removeChild(tabContainer.firstChild);
    }
    while (panelContainer.firstChild) {
      panelContainer.removeChild(panelContainer.firstChild);
    }
  }

  function rebuildGroup(group, tabs = []) {
    clearGroup(group);
    tabs.forEach(tab => ensureTab({ ...tab, group }));
  }

  function onClick(event) {
    const tabEl = event.target?.closest?.(tabSelector);
    if (!tabEl) return;
    const id = tabEl.dataset?.tab;
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    setActiveTab(id);
    ctx?.shell?.renderActiveTab?.();
  }

  nav.addEventListener('click', onClick, true);

  return {
    ensureTab,
    getPanelBodyEl,
    setActiveTab,
    getActiveTabId,
    rebuildGroup,
    clearGroup
  };
}
