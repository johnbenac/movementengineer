# Tab module contract

All tab modules must be created via `createTab(ctx, config)` from `tabKit.js`. `tabKit.js` is the
**only** file allowed to touch `MovementEngineer.tabs` (the global tab registry).

## Required usage

- Use `createTab(ctx, config)` to register a tab.
- Provide a `render(ctx)` function. Rendering must be idempotent.
- Use `setup({ ctx, tab, bucket, rerender })` for one-time event binding.
- Use `reset({ ctx, tab })` for cleanup (tabKit cleans up event listeners via the `bucket`).

Each tab receives the shared `ctx` object created in `src/app/main.js` (store, services, ui, dom,
etc.).

## Forbidden patterns (guard-railed)

Tab modules must never:

- set `MovementEngineer.tabs.*` directly
- call `document.querySelector('.tab.active')` or similar “active tab” DOM probing
- manually subscribe to the store and gate rerenders based on DOM active state
