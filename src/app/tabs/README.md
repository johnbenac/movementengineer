# Tab module contract

Tab modules register themselves on `window.MovementEngineer.tabs` and receive the shared application context (`ctx`) supplied by `src/app/main.js`.

- `render(ctx)` (required): Render the tab contents into the existing DOM.
- `mount(ctx)` (optional): One-time setup hook that runs before the first render.
- `unmount(ctx)` (optional): Cleanup hook if the tab needs to release resources.
- `shouldRender(ctx)` (optional): Early exit hook for future performance optimisations.
