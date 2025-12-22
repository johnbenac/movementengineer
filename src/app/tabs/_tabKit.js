const movementEngineerGlobal = window.MovementEngineer || (window.MovementEngineer = {});

export function getMovementEngineerGlobal() {
  if (!movementEngineerGlobal.tabs) {
    movementEngineerGlobal.tabs = {};
  }
  return movementEngineerGlobal.tabs;
}

export function isTabActive(ctx, tabName) {
  if (!tabName) return false;
  try {
    const activeName = ctx?.shell?.getActiveTabName?.();
    if (activeName) return activeName === tabName;
  } catch (err) {
    console.error(err);
  }

  const activeEl = document.querySelector('.tab.active');
  const activeTab = activeEl?.dataset?.tab || activeEl?.dataset?.tabName || null;
  if (activeTab) return activeTab === tabName;
  return true;
}

export function createListenerBucket() {
  const cleanupFns = [];
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let cleaned = false;

  function on(el, event, handler, options = {}) {
    if (!el?.addEventListener || !event || !handler) return;
    const opts = controller ? { ...options, signal: controller.signal } : options;
    el.addEventListener(event, handler, opts);
    if (!controller) {
      cleanupFns.push(() => el.removeEventListener(event, handler, options));
    }
  }

  function cleanup(fn) {
    if (typeof fn === 'function') cleanupFns.push(fn);
  }

  function offAll() {
    if (cleaned) return;
    cleaned = true;
    if (controller) controller.abort();
    cleanupFns.splice(0).forEach(fn => {
      try {
        fn?.();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return { on, cleanup, offAll };
}

export function createTab(ctx, config) {
  if (!config?.name) throw new Error('createTab: config.name is required');
  if (typeof config.render !== 'function') throw new Error('createTab: render(ctx) is required');

  const tabsGlobal = getMovementEngineerGlobal();
  const name = config.name;
  const shouldSubscribe = config.subscribe !== false;
  const renderWhenInactive = !!config.renderWhenInactive;
  const subscribeWhenInactive = !!config.subscribeWhenInactive;
  const tab = {
    name
  };

  let renderScheduled = false;
  let bucket = null;
  let currentCtx = ctx || null;

  function shouldRender(ctxArg, force = false) {
    if (force) return true;
    if (typeof config.shouldRender === 'function') {
      try {
        const result = config.shouldRender(ctxArg);
        if (result !== undefined) return !!result;
      } catch (err) {
        console.error(err);
      }
    }
    if (renderWhenInactive) return true;
    return isTabActive(ctxArg, name);
  }

  function runRender(force = false) {
    if (!currentCtx) return;
    if (!shouldRender(currentCtx, force)) return;
    return config.render.call(tab, currentCtx);
  }

  function scheduleRender(force = false) {
    if (renderScheduled) return;
    renderScheduled = true;
    tab.render(currentCtx, { force });
    const reset =
      typeof queueMicrotask === 'function' ? queueMicrotask : (fn => setTimeout(fn, 0));
    reset(() => {
      renderScheduled = false;
    });
  }

  tab.rerender = ({ force = false } = {}) => scheduleRender(force);

  tab.mount = async function mount(context) {
    currentCtx = context || ctx;
    bucket = createListenerBucket();

    if (shouldSubscribe && typeof currentCtx?.subscribe === 'function') {
      const unsubscribe = currentCtx.subscribe(() => {
        if (!subscribeWhenInactive && !renderWhenInactive && !isTabActive(currentCtx, name)) {
          return;
        }
        tab.rerender();
      });
      bucket.cleanup(unsubscribe);
    }

    if (typeof config.setup === 'function') {
      await Promise.resolve(
        config.setup({
          ctx: currentCtx,
          tab,
          bucket,
          rerender: tab.rerender
        })
      );
    }
  };

  tab.render = function render(context, options = {}) {
    currentCtx = context || currentCtx || ctx;
    const force = options.force || false;
    return runRender(force);
  };

  tab.unmount = function unmount(context) {
    currentCtx = context || currentCtx || ctx;
    if (typeof config.reset === 'function') {
      try {
        config.reset({ ctx: currentCtx, tab });
      } catch (err) {
        console.error(err);
      }
    }
    bucket?.offAll();
    bucket = null;
    renderScheduled = false;
  };

  if (config.extend && typeof config.extend === 'object') {
    Object.assign(tab, config.extend);
  }

  tabsGlobal[name] = tab;
  if (ctx?.tabs) {
    ctx.tabs[name] = tab;
  }

  return tab;
}
