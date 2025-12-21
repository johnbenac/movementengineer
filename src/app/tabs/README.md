# Tab module contract

Tab modules should register themselves on `window.MovementEngineer.tabs` and implement the following interface:

- `tab.render(ctx)` **required**: called whenever the tab needs to render. Re-rendering should be idempotent.
- `tab.mount(ctx)` optional: called once before the first render to initialise module state.
- `tab.unmount(ctx)` optional: called when the shell switches away or disables the module tab.
- `tab.shouldRender(ctx)` optional: return `false` to skip a render (reserved for future performance gating).

Each tab receives the shared `ctx` object created in `src/app/main.js` (store, services, ui, dom, etc.).
