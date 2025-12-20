## Tab module contract

Tab modules let features opt into ES module ownership for individual tabs while keeping the legacy fallback intact.

- `tab.render(ctx)` **required**: Render the tab UI. Called whenever the tab needs to refresh.
- `tab.mount(ctx)` optional: Called once before the first render; use for one-time setup.
- `tab.unmount(ctx)` optional: Called if the tab is ever detached in the future.
- `tab.shouldRender(ctx)` optional: Reserved for future render gating.

`ctx` is the shared module context injected from `src/app/main.js` (store, services, dom utils, etc.).
