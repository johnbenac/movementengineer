export function getMovementEngineerGlobal() {
  const movementEngineerGlobal = (globalThis.MovementEngineer ||= {});
  movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
  return movementEngineerGlobal.tabs;
}

export function isTabActive(ctx, tabName) {
  try {
    const activeFromShell = ctx?.shell?.getActiveTabName?.();
    if (activeFromShell) return activeFromShell === tabName;
  } catch (err) {
    console.error(err);
  }

  try {
    const activeEl = document.querySelector('.tab.active');
    return activeEl?.dataset?.tab === tabName;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export function createListenerBucket() {
  const cleanupFns = [];
  const hasAbortController = typeof AbortController !== 'undefined';
  const controller = hasAbortController ? new AbortController() : null;
  let didCleanup = false;

  const bucket = {
    on(el, event, handler, options) {
      if (!el?.addEventListener || typeof handler !== 'function') return;

      if (controller) {
        const merged = { ...(options || {}), signal: controller.signal };
        el.addEventListener(event, handler, merged);
      } else {
        el.addEventListener(event, handler, options);
        cleanupFns.push(() => el.removeEventListener(event, handler, options));
      }
    },
    cleanup(fn) {
      if (typeof fn === 'function') cleanupFns.push(fn);
    },
    offAll() {
      if (didCleanup) return;
      didCleanup = true;
      if (controller) controller.abort();
      while (cleanupFns.length) {
        const fn = cleanupFns.pop();
        try {
          fn?.();
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  return bucket;
}

export function createTab(ctx, config) {
  const { name, render, setup, reset, shouldRender, subscribe = true, extend, renderWhenInactive } =
    config || {};

  if (!name) throw new Error('Tab name is required');
  if (typeof render !== 'function') throw new Error(`Tab "${name}" is missing render(ctx)`);

  const tabs = getMovementEngineerGlobal();

  const tab = { name };
  if (extend && typeof extend === 'object') Object.assign(tab, extend);

  let bucket = null;
  let scheduled = false;

  const scheduleRender = (options = {}) => {
    const { force = false, immediate = false } = options;
    const runner = () => {
      scheduled = false;
      const shouldRenderResult =
        typeof shouldRender === 'function' ? shouldRender(ctx) : isTabActive(ctx, name);
      if (!force && !renderWhenInactive && !shouldRenderResult) return;
      tab.render(ctx);
    };

    if (immediate) {
      runner();
      return;
    }

    if (scheduled) return;
    scheduled = true;

    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : typeof queueMicrotask === 'function'
          ? queueMicrotask
          : fn => setTimeout(fn, 0);

    schedule(runner);
  };

  tab.rerender = scheduleRender;

  tab.mount = function mountTab() {
    bucket = createListenerBucket();
    const rerender = opts => scheduleRender(opts || {});

    if (subscribe !== false && typeof ctx?.subscribe === 'function') {
      const unsubscribe = ctx.subscribe(() => rerender({ immediate: true }));
      bucket.cleanup(unsubscribe);
    }

    if (typeof setup === 'function') {
      setup({ ctx, tab, bucket, rerender });
    }
  };

  tab.render = function renderTab(context = ctx) {
    return render.call(tab, context);
  };

  tab.unmount = function unmountTab() {
    if (typeof reset === 'function') {
      try {
        reset({ ctx, tab });
      } catch (err) {
        console.error(err);
      }
    }

    if (bucket) {
      bucket.offAll();
      bucket = null;
    }

    scheduled = false;
  };

  tabs[name] = tab;
  if (ctx?.tabs) ctx.tabs[name] = tab;

  return tab;
}
