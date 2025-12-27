# Route Inventory (PR0)

## Purpose
This document captures the current routing/navigation shape to support the migration away from `src/app/tabs` without changing runtime behavior.

## How routes are defined in this repo
Movement Engineer does not use file-based routing. Navigation is driven by tab registration plus DOM structure:

- Tabs are registered in `src/app/main.js` via `registerToolTabs` and `registerCollectionTabs`, which attach tab modules to `window.MovementEngineer.tabs`.
- The tab shell in `src/app/shell.js` activates tabs by inspecting `.tab` elements and `.tab-panel` sections, plus the URL hash (`#tab-name`).
- The DOM structure for tab panels and the initial “active” tab is defined in `index.html` (the tab panels are static, and `#tab-dashboard` is initially marked `active`).

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

## Route file inventory
Best-effort derived keys normalize away route groups like `(group)` and treat `index` as the folder root. There are no route groups today, so these keys are path-based and should not be interpreted as actual URLs.

| Route File | Type | Notes | Derived Route Key (best-effort) |
| ---------- | ---- | ----- | ------------------------------- |
| `src/app/main.js` | special | App bootstrap; registers tabs and initializes the shell. | `/main` |
| `src/app/shell.js` | layout | Tab shell; reads URL hash and toggles tab panels. | `/shell` |
| `src/app/actions.js` | unknown | Navigation and action helpers used by tabs. | `/actions` |
| `src/app/store.js` | unknown | Central state store. | `/store` |
| `src/app/persistenceFacade.js` | unknown | Persistence orchestration for snapshots. | `/persistenceFacade` |
| `src/app/tabs/dashboard.js` | screen | Dashboard tab module. | `/tabs/dashboard` |
| `src/app/tabs/canon.js` | screen | Library/Canon tab module. | `/tabs/canon` |
| `src/app/tabs/graph.js` | screen | Graph tab module. | `/tabs/graph` |
| `src/app/tabs/collections.js` | screen | Collections JSON editor tab module. | `/tabs/collections` |
| `src/app/tabs/calendar.js` | screen | Calendar tab module. | `/tabs/calendar` |
| `src/app/tabs/comparison.js` | screen | Comparison tab module. | `/tabs/comparison` |
| `src/app/tabs/authority.js` | screen | Authority tab module. | `/tabs/authority` |
| `src/app/tabs/entities.js` | screen | Entities tab module. | `/tabs/entities` |
| `src/app/tabs/practices.js` | screen | Practices tab module. | `/tabs/practices` |
| `src/app/tabs/claims.js` | screen | Claims tab module. | `/tabs/claims` |
| `src/app/tabs/rules.js` | screen | Rules tab module. | `/tabs/rules` |
| `src/app/tabs/media.js` | screen | Media tab module. | `/tabs/media` |
| `src/app/tabs/notes.js` | screen | Notes tab module. | `/tabs/notes` |
| `src/app/tabs/collectionTabs.js` | group | Registers collection-related tabs into the shell. | `/tabs/collectionTabs` |
| `src/app/tabs/toolTabs.js` | group | Registers tool tabs into the shell. | `/tabs/toolTabs` |
| `src/app/tabs/genericCrud.js` | group | Shared CRUD tab helper used by multiple tabs. | `/tabs/genericCrud` |
| `src/app/tabs/tabKit.js` | group | Shared tab UI helpers. | `/tabs/tabKit` |
| `src/app/tabs/canon/actions.js` | group | Canon tab helpers. | `/tabs/canon/actions` |
| `src/app/tabs/canon/libraryView.js` | group | Canon tab UI helpers. | `/tabs/canon/libraryView` |
| `src/app/tabs/graph/workbench.js` | group | Graph tab workbench helpers. | `/tabs/graph/workbench` |
| `src/app/ui/tabManager.js` | unknown | Tab DOM management utilities. | `/ui/tabManager` |
| `src/app/ui/dom.js` | unknown | DOM helpers shared by tabs. | `/ui/dom` |
| `src/app/ui/status.js` | unknown | Status UI helpers. | `/ui/status` |
| `src/app/ui/markdown.js` | unknown | Markdown preview helpers (modal). | `/ui/markdown` |
| `src/app/ui/movements.js` | unknown | Movement sidebar UI. | `/ui/movements` |
| `src/app/ui/schemaDoc.js` | unknown | Schema documentation UI. | `/ui/schemaDoc` |
| `src/app/ui/table.js` | unknown | Table rendering helpers. | `/ui/table` |
| `src/app/ui/sections.js` | unknown | Section UI helpers. | `/ui/sections` |
| `src/app/ui/chips.js` | unknown | Chip UI helpers. | `/ui/chips` |
| `src/app/ui/hints.js` | unknown | Hint UI helpers. | `/ui/hints` |
| `src/app/ui/modelUiHints.js` | unknown | Model UI hints. | `/ui/modelUiHints` |
| `src/app/utils/values.js` | unknown | Utility functions used by tabs and UI. | `/utils/values` |

## Entry points & assumptions
- **Default start route:** The initial active tab is defined in `index.html`; `#tab-dashboard` is marked with the `active` class and becomes the default tab if no URL hash is present. `src/app/shell.js` also falls back to the first `.tab` element in the DOM if no tab is active.
- **Tab layout definition:** The tab markup (tabs nav + panels) lives in `index.html`. `src/app/ui/tabManager.js` and `src/app/shell.js` wire up the behaviors and render the registered tab modules.
- **Special flows:** URL hash navigation (`#tab-name`) activates tabs. The shell listens to `hashchange` and click events on `.tab` elements; there is no dedicated auth gate or modal routing in the current structure.
