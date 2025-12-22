# Tab module contract

Tabs share common lifecycle helpers from `_tabKit.js` to avoid duplicating registration, listener cleanup, and active-tab gating logic.

## Standard pattern

```js
import { createTab } from './_tabKit.js';

function renderExample(ctx) {
  // tab-specific rendering
}

export function registerExampleTab(ctx) {
  return createTab(ctx, {
    name: 'example',
    render: renderExample,
    setup({ bucket, rerender }) {
      bucket.on(document.getElementById('example-filter'), 'change', rerender);
    },
    reset() {
      // optional: clear module-level state
    }
  });
}
```

### Responsibilities

- `render(ctx)` **required**: called when the tab should render. Runs with `this` bound to the tab object. Rendering is automatically gated to active tabs unless `force` is passed to `rerender`.
- `setup({ ctx, tab, bucket, rerender })` optional: called on mount to attach DOM listeners or register additional cleanup via `bucket.cleanup(fn)`.
- `reset({ ctx, tab })` optional: invoked during unmount after listeners/subscriptions are cleared.
- `rerender({ force })`: provided by the kit; coalesces calls and respects active-tab gating unless `force` is `true`.

The kit also registers the tab on `window.MovementEngineer.tabs` and `ctx.tabs`, subscribes to store changes by default, and cleans up listeners via a shared bucket.
