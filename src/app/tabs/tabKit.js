const noop = () => {};

export function getMovementEngineerGlobal() {
  const movementEngineerGlobal = globalThis.MovementEngineer || (globalThis.MovementEngineer = {});
  movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
  return movementEngineerGlobal.tabs;
}

export function isTabActive(ctx, tabName) {
  if (!tabName) return false;

  try {
    const activeFromShell = ctx?.shell?.getActiveTabName?.();
    if (activeFromShell !== undefined && activeFromShell !== null) {
      return activeFromShell === tabName;
    }
  } catch (err) {
    console.error(err);
  }

  const activeEl = document?.querySelector?.('.tab.active');
  if (activeEl) {
    return (activeEl.dataset?.tab || null) === tabName;
  }

  return true;
}

export function createListenerBucket() {
  const disposers = [];
  const hasAbortController = typeof AbortController !== 'undefined';
  const controller = hasAbortController ? new AbortController() : null;
  let cleaned = false;

  function on(el, event, handler, options) {
    if (!el?.addEventListener || typeof handler !== 'function') return;

    const opts = controller ? { ...(options || {}), signal: controller.signal } : options;
    el.addEventListener(event, handler, opts);

    if (!controller) {
      disposers.push(() => {
        if (el?.removeEventListener) {
          el.removeEventListener(event, handler, options);
        }
      });
    }
  }

  function cleanup(fn) {
    if (typeof fn === 'function') {
      disposers.push(fn);
    }
  }

  function offAll() {
    if (cleaned) return;
    cleaned = true;

    if (controller) {
      try {
        controller.abort();
      } catch (err) {
        console.error(err);
      }
    }

    while (disposers.length) {
      const fn = disposers.pop() || noop;
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    }
  }

  return {
    on,
    cleanup,
    offAll
  };
}

export function createTab(ctx, config = {}) {
  const tabsGlobal = getMovementEngineerGlobal();
  const { name, render, setup, reset, shouldRender, subscribe = true, extend } = config;

  if (!name) throw new Error('createTab: config.name is required');
  if (typeof render !== 'function') throw new Error(`createTab(${name}): render(ctx) is required`);

  const tab = { name };

  if (extend && typeof extend === 'object') {
    Object.assign(tab, extend);
  }

  const schedule =
    typeof requestAnimationFrame === 'function'
      ? fn => requestAnimationFrame(fn)
      : typeof queueMicrotask === 'function'
        ? queueMicrotask
        : fn => setTimeout(fn, 0);

  let ctxRef = ctx;
  let bucket = null;
  let scheduled = false;

  function shouldRenderTab(force) {
    if (force) return true;
    if (typeof shouldRender === 'function') return !!shouldRender(ctxRef);
    return isTabActive(ctxRef, name);
  }

  function runRender(force) {
    scheduled = false;
    if (!shouldRenderTab(force)) return;
    return render.call(tab, ctxRef);
  }

  function rerender(options = {}) {
    const { force = false, immediate = false } = options;
    if (scheduled) return;
    scheduled = true;
    if (immediate) {
      return tab.render(ctxRef, { force });
    }
    schedule(() => runRender(force));
  }

  tab.mount = function mount(context) {
    ctxRef = context || ctxRef;
    bucket = createListenerBucket();

    if (subscribe && typeof ctxRef?.subscribe === 'function') {
      const unsubscribe = ctxRef.subscribe(() => rerender({ immediate: true }));
      if (unsubscribe) bucket.cleanup(unsubscribe);
    }

    if (typeof setup === 'function') {
      setup({ ctx: ctxRef, tab, bucket, rerender });
    }
  };

  tab.render = function renderTab(context, options = {}) {
    ctxRef = context || ctxRef;
    const force = options?.force === true;
    return runRender(force);
  };

  tab.unmount = function unmountTab(context) {
    ctxRef = context || ctxRef;
    if (bucket) bucket.offAll();
    bucket = null;
    scheduled = false;
    if (typeof reset === 'function') {
      reset({ ctx: ctxRef, tab });
    }
  };

  tab.rerender = rerender;

  tabsGlobal[name] = tab;
  if (ctxRef?.tabs) {
    ctxRef.tabs[name] = tab;
  }

  return tab;
}
