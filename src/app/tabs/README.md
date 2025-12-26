# Tab module contract

Tabs are created via `createTab(ctx, ...)` from `tabKit.js`. Tab modules must **not** register
with the global registry themselves.

## Required interface

Each tab module should export a registration function that calls `createTab` with:

- `name`: the tab name
- `render(ctx)` **required**: called whenever the tab needs to render. Re-rendering should be idempotent.
- `mount(ctx)` optional: called once before the first render to initialise module state.
- `unmount(ctx)` optional: called when the shell switches away or disables the module tab.
- `setup({ rerender })` optional: use to store a rerender hook instead of wiring state listeners

Each tab receives the shared `ctx` object created in `src/app/main.js` (store, services, ui, dom, etc.).

## Guardrails (do not violate)

The following rules are enforced by `tools/check-style.mjs`:

- **Only** `src/app/tabs/tabKit.js` may touch `MovementEngineer.tabs`.
- Tab modules must **never** do DOM probing with `.tab.active` (use shell APIs instead).
- Tab modules must **never** manually register themselves on globals.
- Tab modules must **never** manually subscribe + gate renders on “if active tab then rerender”.

If you need access to the active tab, use `ctx.shell.getActiveTabName()`.
