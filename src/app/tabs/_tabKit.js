const movementEngineerGlobal = (globalThis.MovementEngineer ||= {});

export function getMovementEngineerGlobal() {
  movementEngineerGlobal.tabs = movementEngineerGlobal.tabs || {};
  return movementEngineerGlobal.tabs;
}

export function isTabActive(ctx, tabName) {
  if (!tabName) return false;
  const getActive = ctx?.shell?.getActiveTabName;
  if (typeof getActive === 'function') {
    try {
      return getActive() === tabName;
    } catch (err) {
      console.error('Failed to read active tab from shell', err);
    }
  }
  const activeEl = document.querySelector('.tab.active');
  if (activeEl) return activeEl?.dataset?.tab === tabName;
  return true;
}

export function createListenerBucket() {
  const disposers = [];
  let isOff = false;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;

  function on(el, event, handler, options) {
    if (!el?.addEventListener || !event || typeof handler !== 'function') return () => {};
    if (controller) {
      el.addEventListener(event, handler, { ...options, signal: controller.signal });
      const disposer = () => {
        if (el?.removeEventListener) {
          el.removeEventListener(event, handler, options);
        }
      };
      disposers.push(disposer);
      return disposer;
    }
    el.addEventListener(event, handler, options);
    const disposer = () => {
      if (el?.removeEventListener) {
        el.removeEventListener(event, handler, options);
      }
    };
    disposers.push(disposer);
    return disposer;
  }

  function cleanup(fn) {
    if (typeof fn === 'function') disposers.push(fn);
    return fn;
  }

  function offAll() {
    if (isOff) return;
    isOff = true;
    if (controller) controller.abort();
    while (disposers.length) {
      const dispose = disposers.pop();
      try {
        dispose?.();
      } catch (err) {
        console.error('Failed to dispose listener', err);
      }
    }
  }

  return { on, cleanup, offAll };
}

export function createTab(ctx, config = {}) {
  if (!config.name) throw new Error('Tab config.name is required');
  if (typeof config.render !== 'function') throw new Error(`Tab "${config.name}" needs render(ctx)`);

  const tabsGlobal = getMovementEngineerGlobal();
  const name = config.name;
  let listenerBucket = null;
  let renderScheduled = false;

  function shouldRender({ force } = {}) {
    if (force) return true;
    if (typeof config.shouldRender === 'function') {
      try {
        return !!config.shouldRender(ctx);
      } catch (err) {
        console.error(`Tab "${name}" shouldRender failed`, err);
        return false;
      }
    }
    if (config.renderWhenInactive) return true;
    return isTabActive(ctx, name);
  }

  function runRender(options = {}) {
    if (!shouldRender(options)) return;
    return config.render.call(tab, ctx);
  }

  function scheduleRender(options = {}) {
    if ((renderScheduled && !options.immediate) || !shouldRender(options)) return;
    renderScheduled = true;
    const runner = () => {
      renderScheduled = false;
      tab.render(ctx, options);
    };
    if (options.immediate) {
      runner();
      return;
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(runner);
    } else if (typeof queueMicrotask === 'function') {
      queueMicrotask(runner);
    } else {
      setTimeout(runner, 0);
    }
  }

  const tab = {
    name,
    rerender(options = {}) {
      const force = !!options.force;
      scheduleRender({ ...options, force });
    },
    mount(context = ctx) {
      listenerBucket = createListenerBucket();
      const bucket = listenerBucket;
      if (config.subscribe !== false && typeof context?.subscribe === 'function') {
        const unsubscribe = context.subscribe(() => tab.rerender({ immediate: true }));
        bucket.cleanup(unsubscribe);
      }
      if (typeof config.setup === 'function') {
        config.setup({ ctx: context, tab, bucket, rerender: tab.rerender });
      }
    },
    render(context = ctx, options = {}) {
      return runRender({ ...options, ctx: context });
    },
    unmount(context = ctx) {
      if (typeof config.reset === 'function') {
        try {
          config.reset({ ctx: context, tab });
        } catch (err) {
          console.error(`Tab "${name}" reset() failed`, err);
        }
      }
      listenerBucket?.offAll();
      listenerBucket = null;
      renderScheduled = false;
    }
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
