# Route inventory (current state)

## Purpose

This document captures the current routing/navigation structure to support the planned migration away from `src/app/tabs` without changing runtime behavior.
Destination skeleton folders under `src/app` exist for future migration work, but they are intentionally unused today and do not affect current navigation.

## How routes are defined in this repo

Movement Engineer does not use a file-based router. Instead, routing is tab-driven and hash-based:

- `src/app/main.js` bootstraps the app, registers tabs on `window.MovementEngineer.tabs`, and initializes the shell.
- `src/app/shell.js` reads the current hash (e.g., `#dashboard`) and DOM tab state to determine the active tab, then mounts/renders the registered tab module.
- `src/app/ui/tabManager.js` manages the DOM for tabs/panels and is the main utility for tab creation/removal.

Because routing is driven by tab registration and DOM state, the file tree below is an inventory of the modules that participate in tab registration, rendering, and navigation utilities.

## Current route file tree under `src/app`

```
src/app/
  actions.js
  main.js
  persistenceFacade.js
  shell.js
  store.js
  tabs/
    README.md
    authority.js
    calendar.js
    canon.js
    canon/
      actions.js
      libraryView.js
    claims.js
    collectionTabs.js
    collections.js
    comparison.js
    dashboard.js
    entities.js
    genericCrud.js
    graph.js
    graph/
      workbench.js
    media.js
    notes.js
    practices.js
    rules.js
    tabKit.js
    toolTabs.js
  ui/
    chips.js
    dom.js
    hints.js
    markdown.js
    modelUiHints.js
    movements.js
    schemaDoc.js
    sections.js
    status.js
    tabManager.js
    table.js
  utils/
    values.js
```

## Route inventory table

Best-effort derived route keys are computed from file paths under `src/app` with these assumptions:

- `src/app` is the root.
- `index` segments are treated as directory roots.
- Route groups like `(group)` are ignored (none present today).
- This does **not** reflect actual runtime tab IDs, which are registered in `main.js` and in the tab modules.

| Route File | Type | Derived Route Key (best-effort) | Notes |
| ---------- | ---- | ------------------------------ | ----- |
| `src/app/actions.js` | unknown | `/actions` | Navigation/action helpers used by tabs. |
| `src/app/main.js` | special | `/main` | Entrypoint bootstrapping and tab registration. |
| `src/app/persistenceFacade.js` | unknown | `/persistenceFacade` | Persistence wiring for snapshot storage. |
| `src/app/shell.js` | special | `/shell` | Hash/tab shell controller for navigation. |
| `src/app/store.js` | unknown | `/store` | Central state store. |
| `src/app/tabs/authority.js` | screen | `/tabs/authority` | Tab module for authority. |
| `src/app/tabs/calendar.js` | screen | `/tabs/calendar` | Tab module for calendar. |
| `src/app/tabs/canon.js` | screen | `/tabs/canon` | Tab module for canon. |
| `src/app/tabs/canon/actions.js` | unknown | `/tabs/canon/actions` | Canon tab helpers/actions. |
| `src/app/tabs/canon/libraryView.js` | unknown | `/tabs/canon/libraryView` | Canon tab subview. |
| `src/app/tabs/claims.js` | screen | `/tabs/claims` | Tab module for claims (collection tab). |
| `src/app/tabs/collectionTabs.js` | group | `/tabs/collectionTabs` | Registers dynamic collection tabs. |
| `src/app/tabs/collections.js` | screen | `/tabs/collections` | Tab module for collections. |
| `src/app/tabs/comparison.js` | screen | `/tabs/comparison` | Tab module for comparisons. |
| `src/app/tabs/dashboard.js` | screen | `/tabs/dashboard` | Tab module for dashboard (default tab). |
| `src/app/tabs/entities.js` | screen | `/tabs/entities` | Tab module for entities (collection tab). |
| `src/app/tabs/genericCrud.js` | unknown | `/tabs/genericCrud` | Generic CRUD helpers used by tabs. |
| `src/app/tabs/graph.js` | screen | `/tabs/graph` | Tab module for graph. |
| `src/app/tabs/graph/workbench.js` | unknown | `/tabs/graph/workbench` | Graph tab subview/workbench. |
| `src/app/tabs/media.js` | screen | `/tabs/media` | Tab module for media (collection tab). |
| `src/app/tabs/notes.js` | screen | `/tabs/notes` | Tab module for notes. |
| `src/app/tabs/practices.js` | screen | `/tabs/practices` | Tab module for practices (collection tab). |
| `src/app/tabs/rules.js` | screen | `/tabs/rules` | Tab module for rules (collection tab). |
| `src/app/tabs/tabKit.js` | unknown | `/tabs/tabKit` | Tab helper utilities for setup/render. |
| `src/app/tabs/toolTabs.js` | group | `/tabs/toolTabs` | Registers non-collection tool tabs. |
| `src/app/ui/chips.js` | unknown | `/ui/chips` | UI component utilities. |
| `src/app/ui/dom.js` | unknown | `/ui/dom` | DOM helpers used by tabs. |
| `src/app/ui/hints.js` | unknown | `/ui/hints` | UI hints helpers. |
| `src/app/ui/markdown.js` | special | `/ui/markdown` | Markdown preview/modal behavior. |
| `src/app/ui/modelUiHints.js` | unknown | `/ui/modelUiHints` | UI hints for model schemas. |
| `src/app/ui/movements.js` | special | `/ui/movements` | Movement selector UI, influences current movement. |
| `src/app/ui/schemaDoc.js` | unknown | `/ui/schemaDoc` | Schema rendering helpers. |
| `src/app/ui/sections.js` | unknown | `/ui/sections` | Section layout helpers. |
| `src/app/ui/status.js` | special | `/ui/status` | Status/notification UI. |
| `src/app/ui/tabManager.js` | special | `/ui/tabManager` | Tab DOM creation/removal. |
| `src/app/ui/table.js` | unknown | `/ui/table` | Table rendering helpers. |
| `src/app/utils/values.js` | unknown | `/utils/values` | Utility helpers. |

## Entry points & assumptions

- **Default start route:** The shell resolves the active tab from DOM state or URL hash and falls back to the first tab in the DOM (`src/app/shell.js`). In practice the dashboard tab is the initial/default tab, as it is registered early in `src/app/main.js` and appears first in the tab DOM.
- **Tab layout definition:** Tab DOM structure and panel wiring are owned by `src/app/ui/tabManager.js`, which creates tabs and panels used by `src/app/shell.js`.
- **Special flows:**
  - **Hash-based deep links:** `src/app/shell.js` reads `window.location.hash` to activate a tab by name.
  - **Dynamic collection tabs:** `src/app/tabs/collectionTabs.js` creates tabs based on the current model’s collections, which can add/remove tabs at runtime.
  - **Movement selection:** `src/app/ui/movements.js` updates `currentMovementId` and triggers tab re-rendering.
