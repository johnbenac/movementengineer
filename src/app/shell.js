const SHELL_FLAG = '__MODULE_SHELL_INITIALIZED__';

function getTabNameFromEl(el) {
  if (!el) return null;

  const ds = el.dataset || {};
  if (ds.tab || ds.tabName || ds.name) return ds.tab || ds.tabName || ds.name;

  const href = el.getAttribute?.('href');
  if (href && href.startsWith('#') && href.length > 1) {
    return href.slice(1);
  }

  const controls = el.getAttribute?.('aria-controls');
  if (controls) return controls.replace(/^tab-/, '').replace(/-panel$/, '');

  const id = el.id;
  if (id) return id.replace(/^tab-/, '').replace(/-tab$/, '');

  return null;
}

function getPanelNameFromEl(panelEl) {
  if (!panelEl) return null;

  const ds = panelEl.dataset || {};
  if (ds.tabPanel || ds.tab || ds.name) return ds.tabPanel || ds.tab || ds.name;

  const id = panelEl.id;
  if (id) return id.replace(/^tab-/, '').replace(/-panel$/, '');

  return null;
}

export function initShell(ctx, options = {}) {
  if (window[SHELL_FLAG]) return window[SHELL_FLAG];
  if (ctx?.shell?.__initialized) return ctx.shell;

  const tabSelector = options.tabSelector || '.tab';
  const panelSelector = options.panelSelector || '.tab-panel';
  const activeClass = options.activeClass || 'active';

  const tabs = Array.from(document.querySelectorAll(tabSelector));
  const panels = Array.from(document.querySelectorAll(panelSelector));

  const mounted = new Set();
  let currentTabName = null;

  function findKnownTabNames() {
    return tabs.map(getTabNameFromEl).filter(Boolean);
  }

  function getActiveTabName() {
    const known = findKnownTabNames();
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash && known.includes(hash)) return hash;

    const activeEl = document.querySelector(`${tabSelector}.${activeClass}`);
    const activeName = getTabNameFromEl(activeEl);
    if (activeName) return activeName;

    return known[0] || null;
  }

  function activateTab(name) {
    if (!name) return;

    tabs.forEach(tabEl => {
      const tabName = getTabNameFromEl(tabEl);
      const isActive = tabName === name;
      tabEl.classList.toggle(activeClass, isActive);
      tabEl.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tabEl.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach(panelEl => {
      const panelName = getPanelNameFromEl(panelEl);
      const isActive = panelName === name;
      panelEl.classList.toggle(activeClass, isActive);
      panelEl.hidden = !isActive;
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
      } else {
        throw new Error(`Tab "${nextName}" has no render(ctx)`);
      }
    } catch (err) {
      console.error(err);
      ctx?.ui?.showFatalImportError?.(err);
      ctx?.showFatalImportError?.(err);
    }
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

  renderActiveTab();

  function destroy() {
    document.removeEventListener('click', onClick, true);
    window.removeEventListener('hashchange', onHashChange);
  }

  const api = { getActiveTabName, activateTab, renderActiveTab, destroy, __initialized: true };
  ctx.shell = api;
  window[SHELL_FLAG] = api;
  return api;
}
