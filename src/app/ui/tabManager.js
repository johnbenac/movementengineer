function ensureContainer(parent, { id, className, tag = 'div' }) {
  if (!parent) return null;
  let el = parent.querySelector(`#${id}`);
  if (!el) {
    el = document.createElement(tag);
    el.id = id;
    if (className) el.className = className;
    parent.appendChild(el);
  }
  return el;
}

function normalizeLabel(label) {
  if (label === undefined || label === null) return '';
  return String(label);
}

export function createTabManager(ctx, options = {}) {
  const nav =
    document.getElementById(options.navId || 'tabs-nav') ||
    document.querySelector(options.navSelector || '.tabs');

  const toolTabs = ensureContainer(nav, { id: 'tool-tabs', className: 'tab-group' });
  const collectionTabs = ensureContainer(nav, { id: 'collection-tabs', className: 'tab-group' });

  const toolPanels =
    document.getElementById('tool-panels') ||
    ensureContainer(document.querySelector(options.panelsRoot || '.content'), {
      id: 'tool-panels'
    });
  const collectionPanels =
    document.getElementById('collection-panels') ||
    ensureContainer(document.querySelector(options.panelsRoot || '.content'), {
      id: 'collection-panels'
    });

  function getGroupContainers(group) {
    const useTool = group === 'tool';
    return {
      tabGroup: useTool ? toolTabs : collectionTabs,
      panelGroup: useTool ? toolPanels : collectionPanels
    };
  }

  function ensureTabButton({ id, label, group }) {
    const { tabGroup } = getGroupContainers(group);
    if (!tabGroup) return null;
    let tab = tabGroup.querySelector(`[data-tab="${id}"]`);
    if (!tab) {
      tab = document.createElement('button');
      tab.className = 'tab';
      tab.dataset.tab = id;
      tab.dataset.tabGroup = group;
      tab.dataset.managed = 'true';
      tab.type = 'button';
      tabGroup.appendChild(tab);
    }
    const nextLabel = normalizeLabel(label || id);
    if (nextLabel && tab.textContent !== nextLabel) {
      tab.textContent = nextLabel;
    }
    tab.setAttribute('aria-controls', `tab-${id}`);
    return tab;
  }

  function ensureTabPanel({ id, group }) {
    const { panelGroup } = getGroupContainers(group);
    const panelId = `tab-${id}`;
    let panel = document.getElementById(panelId);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = panelId;
      panel.className = 'tab-panel';
      panel.dataset.managed = 'true';
      if (panelGroup) panelGroup.appendChild(panel);
    } else if (panelGroup && panel.parentElement !== panelGroup) {
      panelGroup.appendChild(panel);
    }
    if (panel) {
      panel.dataset.tabPanel = id;
      panel.dataset.tabGroup = group;
      panel.dataset.managed = panel.dataset.managed || 'true';
    }
    return panel;
  }

  function getPanelBodyEl(id) {
    const panelId = `tab-${id}`;
    const panel = document.getElementById(panelId);
    if (!panel) return null;

    let body = panel.querySelector(`[data-tab-body="${id}"]`);
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
    const tab = ensureTabButton({ id, label, group });
    const panel = ensureTabPanel({ id, group });
    const body = getPanelBodyEl(id);
    return { tab, panel, body };
  }

  function removeTab(id) {
    const tab = nav?.querySelector(`[data-tab="${id}"]`);
    if (tab) tab.remove();
    const panel = document.getElementById(`tab-${id}`);
    if (panel) panel.remove();
  }

  function setActiveTab(id) {
    ctx?.shell?.activateTab?.(id);
    return ctx?.shell?.renderActiveTab?.();
  }

  return {
    ensureTab,
    getPanelBodyEl,
    removeTab,
    setActiveTab
  };
}
