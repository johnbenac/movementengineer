# Tab module contract

Tab modules provide self-contained renderers for individual tabs without relying on the legacy `app.js` switch statement.

- `tab.render(ctx)` (required): Render the tab using the provided context object.
- `tab.mount(ctx)` (optional): Run once before the first render.
- `tab.unmount(ctx)` (optional): Cleanup if the tab is ever detached.
- `tab.shouldRender(ctx)` (optional): Future performance hook to skip renders when not needed.

Register tabs on `window.MovementEngineer.tabs[tabName]` so `app.js` can delegate rendering when the tab is active.
