# Navigation Smoke Test Checklist

Run this on simulator/device after pulling the branch.

## Checklist

1. **Launch the app** → The initial screen renders without errors (status UI visible, no fatal import error).
2. **Default tab loads** → The first tool tab (typically Dashboard) is active on load when no hash is present.
3. **Tool tabs** → Navigate to each available tool tab and confirm content renders:
   - Dashboard
   - Library (Canon)
   - Graph
   - Collections
   - Comparison
   - Authority
   - Generic CRUD (only if feature-flagged)
4. **Collection tabs** → With a movement loaded, navigate to the core collection tabs and confirm list/detail views render:
   - Entities
   - Practices
   - Claims
   - Rules
   - Media
5. **Critical flows** → Perform the top 2–4 critical flows:
   - Dashboard → select a movement (if multiple) and confirm the selection updates the view.
   - Entities → open a record detail, then return to the list.
   - Graph → open the graph view and verify the canvas renders.
   - Collections → open a collection and confirm list UI renders.
6. **Back navigation** → Use the browser back button or in-app navigation to return to the previous tab and confirm it re-renders correctly.
7. **Auth** → If any auth/permissions are required in your environment, confirm the sign-in flow still works. If auth is not available locally, note it as skipped.

## Report template

- Device/platform:
- Build type:
- Pass/fail per step:
- Notes/screenshots:
