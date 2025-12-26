# Tab module contract

All tabs must be created through `createTab(ctx, ...)` from `src/app/tabs/tabKit.js`.
That factory is the **only** place allowed to touch the global tab registry.

## Required pattern

- Build a tab module that exports a `register*Tab(ctx)` function.
- Inside it, call `createTab(ctx, { name, render, setup, ... })`.
- `render(ctx)` is **required** and must be idempotent.
- `setup({ ctx, tab, bucket, rerender })` is optional and is the place to register listeners.

Each tab receives the shared `ctx` object created in `src/app/main.js` (store, services, ui, dom, etc.).

## Prohibited patterns (guarded by CI)

Tab modules must never:

- touch the global registry (`window.MovementEngineer.tabs`, `globalThis.MovementEngineer.tabs`, etc.)
- probe the DOM for active tabs (e.g. `.tab.active`)
- manually subscribe to the store and gate renders with “if active tab then rerender”

If you need active-tab awareness, use the helpers in `tabKit.js` or the shell APIs on `ctx.shell`.
