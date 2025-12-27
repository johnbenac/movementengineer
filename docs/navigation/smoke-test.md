# Navigation smoke test checklist

Run this on a simulator/device (or local browser) after pulling the branch to confirm navigation
still works as expected.

## Checklist

1. **Launch app → first screen loads**
   - Start the app (e.g., `node tools/dev-server.js`) and open the UI.
   - **Expected:** Dashboard loads, no fatal error banner.

2. **Navigate each tool tab**
   - Click each tool tab in the top nav: **Dashboard**, **Library**, **Graph**,
     **Collections**, **Comparison**, **Authority**.
   - **Expected:** Each tab renders its panel without errors.

3. **Navigate collection tabs**
   - Click each collection tab in the collection group (e.g., **Entities**, **Practices**,
     **Claims**, **Rules**, **Media**, plus any model-driven collections that appear).
   - **Expected:** Collection tabs load their list/editor UI without errors.

4. **Critical flow: Dashboard → save movement**
   - On Dashboard, select a movement from the sidebar, change a harmless field (e.g., name),
     and click “Save movement.”
   - **Expected:** Save banner clears and the updated value persists in the UI.

5. **Critical flow: Library/Canon navigation**
   - Open Library, select a shelf, then open a book/section if available.
   - **Expected:** Shelf/book/section content renders without errors.

6. **Critical flow: Graph view**
   - Open Graph and wait for the graph to render.
   - **Expected:** Graph view loads without console errors and shows nodes/edges.

7. **Back navigation**
   - Use browser back/forward to move between at least two tabs (e.g., Graph → Library → Back).
   - **Expected:** Tabs change correctly and the URL hash reflects the active tab.

8. **Auth check**
   - There is no local auth flow in this app. If a future auth gate exists, confirm sign-in
     is reachable or note that auth is not applicable in this environment.

## Report template

- Device/platform:
- Build type:
- Pass/fail per step:
- Notes/screenshots:
