const movementEngineerGlobal =
  globalThis.MovementEngineer || (globalThis.MovementEngineer = {});
const TAB_MANAGER_KEY = '__tabManager';

function normaliseName(name) {
  if (!name) return null;
  return String(name)
    .replace(/^#/, '')
    .replace(/^tab-/, '')
    .replace(/-panel$/, '')
    .replace(/-tab$/, '');
}

function getTabNameFromEl(el) {
  if (!el) return null;

  const ds = el.dataset || {};
  const direct = ds.tab || ds.tabName || ds.name || ds.target || ds.panel || null;
  if (direct) return normaliseName(direct);

  const href = el.getAttribute?.('href');
  if (href && href.startsWith('#')) return normaliseName(href);

  const controls = el.getAttribute?.('aria-controls');
  if (controls) return normaliseName(controls);

  const id = el.id;
  if (id) return normaliseName(id);

  return null;
}

function getPanelNameFromEl(panelEl) {
  if (!panelEl) return null;

  const ds = panelEl.dataset || {};
  const direct = ds.tabPanel || ds.tab || ds.name || null;
  if (direct) return normaliseName(direct);

  const id = panelEl.id;
  if (id) return normaliseName(id);

  return null;
}

function createGroup({ tabsEl, panelsEl }) {
  return {
    tabsEl,
    panelsEl,
    tabs: new Map()
  };
}

export function createTabManager(ctx, options = {}) {
  if (movementEngineerGlobal[TAB_MANAGER_KEY]) return movementEngineerGlobal[TAB_MANAGER_KEY];

  const tabSelector = options.tabSelector || '.tab';
  const panelSelector = options.panelSelector || '.tab-panel';
  const activeClass = options.activeClass || 'active';

  const toolTabsEl = document.querySelector(options.toolTabsSelector || '#tool-tabs');
  const collectionTabsEl = document.querySelector(options.collectionTabsSelector || '#collection-tabs');
  const toolPanelsEl = document.querySelector(options.toolPanelsSelector || '#tool-panels');
  const collectionPanelsEl = document.querySelector(
    options.collectionPanelsSelector || '#collection-panels'
  );

  const groups = {
    tool: createGroup({ tabsEl: toolTabsEl, panelsEl: toolPanelsEl }),
    collection: createGroup({ tabsEl: collectionTabsEl, panelsEl: collectionPanelsEl })
  };

  const mounted = new Set();
  let currentTabName = null;
  let currentDefinitions = { tool: [], collection: [] };

  function listTabIds() {
    return [...groups.tool.tabs.keys(), ...groups.collection.tabs.keys()];
  }

  function getTabGroup(groupName) {
    return groups[groupName] || groups.collection;
  }

  function ensureTab({ id, label, group = 'collection' }) {
    if (!id) return null;
    const groupInfo = getTabGroup(group);
    if (!groupInfo?.tabsEl || !groupInfo?.panelsEl) return null;

    let tabEl = groupInfo.tabsEl.querySelector(`[data-tab="${id}"]`);
    if (!tabEl) {
      tabEl = document.createElement('button');
      tabEl.type = 'button';
      tabEl.className = 'tab';
      tabEl.dataset.tab = id;
      tabEl.dataset.tabManaged = 'true';
      groupInfo.tabsEl.appendChild(tabEl);
    }
    if (label) tabEl.textContent = label;

    let panelEl = document.getElementById(`tab-${id}`);
    if (!panelEl) {
      panelEl = groupInfo.panelsEl.querySelector(`[data-tab-panel="${id}"]`);
    }
    if (!panelEl) {
      panelEl = document.createElement('section');
      panelEl.id = `tab-${id}`;
      panelEl.className = 'tab-panel';
      panelEl.dataset.tabPanel = id;
      panelEl.dataset.tabManaged = 'true';
      groupInfo.panelsEl.appendChild(panelEl);
    } else {
      panelEl.classList.add('tab-panel');
      if (!panelEl.dataset.tabPanel) {
        panelEl.dataset.tabPanel = id;
      }
      panelEl.dataset.tabManaged = 'true';
      if (!groupInfo.panelsEl.contains(panelEl)) {
        groupInfo.panelsEl.appendChild(panelEl);
      }
    }

    let bodyEl = panelEl.querySelector(`[data-tab-body="${id}"]`);
    if (!bodyEl) {
      bodyEl = panelEl.querySelector('.panel-body');
      if (!bodyEl) {
        bodyEl = document.createElement('div');
        bodyEl.className = 'panel-body';
        panelEl.appendChild(bodyEl);
      }
      bodyEl.dataset.tabBody = id;
    }

    groupInfo.tabs.set(id, { id, group, tabEl, panelEl, bodyEl });
    return groupInfo.tabs.get(id);
  }

  function getPanelBodyEl(id) {
    if (!id) return null;
    const entry = groups.tool.tabs.get(id) || groups.collection.tabs.get(id);
    if (entry?.bodyEl) return entry.bodyEl;

    const panelEl = document.getElementById(`tab-${id}`);
    if (!panelEl) return null;
    let bodyEl = panelEl.querySelector(`[data-tab-body="${id}"]`);
    if (!bodyEl) {
      bodyEl = panelEl.querySelector('.panel-body');
      if (!bodyEl) {
        bodyEl = document.createElement('div');
        bodyEl.className = 'panel-body';
        panelEl.appendChild(bodyEl);
      }
      bodyEl.dataset.tabBody = id;
    }
    return bodyEl;
  }

  function getActiveTabName() {
    const known = listTabIds();

    const activeEl = document.querySelector(`${tabSelector}.${activeClass}`);
    const activeName = getTabNameFromEl(activeEl);
    if (activeName) return activeName;

    const activePanel = document.querySelector(`${panelSelector}.${activeClass}`);
    const panelName = getPanelNameFromEl(activePanel);
    if (panelName) return panelName;

    const hash = normaliseName(window.location.hash || '');
    if (hash && known.includes(hash)) return hash;

    return known[0] || null;
  }

  function activateTab(name) {
    if (!name) return;

    const allTabs = [...groups.tool.tabs.values(), ...groups.collection.tabs.values()];
    allTabs.forEach(entry => {
      const isActive = entry.id === name;
      entry.tabEl.classList.toggle(activeClass, isActive);
      entry.tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
      entry.tabEl.tabIndex = isActive ? 0 : -1;
      entry.panelEl.classList.toggle(activeClass, isActive);
    });
  }

  async function renderActiveTab() {
    const nextName = getActiveTabName();
    if (!nextName) return;

    ctx?.ui?.clearFatalImportError?.();
    ctx?.clearFatalImportError?.();

    if (currentTabName && currentTabName !== nextName) {
      const prevTab = ctx?.tabs?.[currentTabName];
      if (prevTab?.unmount) {
        try {
          await Promise.resolve(prevTab.unmount(ctx));
        } catch (err) {
          console.error(err);
        }
      }
      mounted.delete(currentTabName);
    }

    currentTabName = nextName;
    activateTab(nextName);

    const tab = ctx?.tabs?.[nextName];
    if (!tab) {
      const err = new Error(`No tab registered for "${nextName}"`);
      console.error(err);
      ctx?.ui?.showFatalImportError?.(err);
      ctx?.showFatalImportError?.(err);
      return;
    }

    try {
      if (!mounted.has(nextName) && typeof tab.mount === 'function') {
        await Promise.resolve(tab.mount(ctx));
        mounted.add(nextName);
      }

      if (typeof tab.render === 'function') {
        await Promise.resolve(tab.render(ctx));
        ctx?.dom?.assertNoBareChips?.(document);
      } else {
        throw new Error(`Tab "${nextName}" has no render(ctx)`);
      }
    } catch (err) {
      console.error(err);
      ctx?.ui?.showFatalImportError?.(err);
      ctx?.showFatalImportError?.(err);
    }
  }

  function removeTab(entry) {
    if (!entry) return;
    try {
      entry.tabEl?.remove?.();
    } catch (err) {
      console.error(err);
    }
    try {
      if (entry.panelEl?.dataset?.tabManaged === 'true') {
        entry.panelEl.remove?.();
      }
    } catch (err) {
      console.error(err);
    }
    groups[entry.group]?.tabs?.delete(entry.id);
  }

  function rebuildGroup(groupName, definitions = []) {
    const groupInfo = getTabGroup(groupName);
    if (!groupInfo?.tabsEl || !groupInfo?.panelsEl) return;

    const nextIds = new Set(definitions.map(def => def.id));
    Array.from(groupInfo.tabs.values()).forEach(entry => {
      if (!nextIds.has(entry.id)) removeTab(entry);
    });

    definitions.forEach(def => {
      const entry = ensureTab({ id: def.id, label: def.label, group: groupName });
      if (!entry) return;
      groupInfo.tabs.delete(entry.id);
      groupInfo.tabs.set(entry.id, entry);
      groupInfo.tabsEl.appendChild(entry.tabEl);
      if (!groupInfo.panelsEl.contains(entry.panelEl)) {
        groupInfo.panelsEl.appendChild(entry.panelEl);
      }
    });
  }

  function rebuild({ toolTabs, collectionTabs } = {}) {
    if (Array.isArray(toolTabs)) currentDefinitions.tool = toolTabs;
    if (Array.isArray(collectionTabs)) currentDefinitions.collection = collectionTabs;

    rebuildGroup('tool', currentDefinitions.tool);
    rebuildGroup('collection', currentDefinitions.collection);

    const active = getActiveTabName();
    if (!active) return;
    activateTab(active);
  }

  function onClick(e) {
    const tabEl = e.target?.closest?.(tabSelector);
    if (!tabEl) return;

    const name = getTabNameFromEl(tabEl);
    if (!name) return;

    e.preventDefault();
    e.stopPropagation();

    activateTab(name);
    renderActiveTab();
  }

  function onHashChange() {
    renderActiveTab();
  }

  document.addEventListener('click', onClick, true);
  window.addEventListener('hashchange', onHashChange);

  const api = {
    ensureTab,
    rebuild,
    getPanelBodyEl,
    getActiveTabName,
    activateTab,
    renderActiveTab,
    destroy() {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('hashchange', onHashChange);
      movementEngineerGlobal[TAB_MANAGER_KEY] = null;
      if (ctx && 'shell' in ctx) ctx.shell = null;
      if (ctx && 'tabManager' in ctx) ctx.tabManager = null;
    }
  };

  movementEngineerGlobal[TAB_MANAGER_KEY] = api;
  if (ctx) {
    ctx.shell = api;
    ctx.tabManager = api;
  }

  return api;
}
