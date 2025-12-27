# Navigation smoke test checklist

Run this on simulator/device after pulling the branch.

## Checklist

1. **Launch app → first screen loads**
   - Expected: App loads without fatal errors; default tab renders (dashboard).
2. **Navigate to each existing tab**
   - Expected: Each tab activates and renders without fatal errors.
   - Tabs to verify (current core set): Dashboard, Graph, Calendar, Canon, Comparison, Collections, Authority, Notes, Media, Practices, Claims, Rules, Entities.
3. **Open critical flows** (pick the top 2–4 flows below)
   - **Dashboard → open an item** (e.g., select a movement or entity from the dashboard).
   - **Graph → open workbench view** (verify graph panel renders).
   - **Canon → open library view** (verify list renders).
   - **Collections → open a collection record** (verify CRUD view renders).
   - Expected: Each flow opens without errors and UI remains responsive.
4. **Back navigation**
   - Expected: Back button or browser back returns to the previous tab or previous state without breaking the UI.
5. **Auth (if applicable)**
   - Expected: If auth exists locally, sign-in flow completes. If auth is not available in the local environment, note “skipped (not available locally).”

## Report template

- Device/platform:
- Build type:
- Step 1 pass/fail:
- Step 2 pass/fail:
- Step 3 pass/fail (list flows tested):
- Step 4 pass/fail:
- Step 5 pass/fail (or skipped):
- Notes/screenshots:

