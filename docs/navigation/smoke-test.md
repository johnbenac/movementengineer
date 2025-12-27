# Navigation Smoke Test Checklist

Run this on simulator/device after pulling the branch.

1. **Launch app → first screen loads**
   - Expected: Dashboard tab renders with movement details form and dashboard content.
2. **Navigate to each existing tab**
   - Expected: Each tab renders without errors and shows its primary UI.
   - Tabs to visit: Dashboard, Library (Canon), Graph, Collections, Calendar, Comparison, Authority, Entities, Practices, Claims, Rules, Media, Notes.
3. **Critical flows**
   1. **Dashboard → Movement edit**
      - Update a movement field and confirm the save controls respond (no errors).
   2. **Library (Canon) → Select shelf/book**
      - Select a shelf and a book; confirm the editor panes populate.
   3. **Entities → Open an entity**
      - Select a movement, pick an entity, and confirm details render.
   4. **Graph → Render workbench**
      - Open the Graph tab and confirm the workbench loads without errors.
4. **Back navigation**
   - Use browser back after changing tabs (via hash) and confirm the prior tab re-activates.
5. **Auth (if applicable)**
   - Not applicable in local builds; no sign-in flow is present. If a hosted auth wrapper is used, verify the sign-in page loads and returns to the app.

## Report template
- Device/platform:
- Build type:
- Pass/fail per step:
- Notes/screenshots:
