# Route Inventory (PR0)

## Purpose

This document is a single source of truth for the current navigation/routing shape in Movement Engineer. It exists to support the migration arc that removes `src/app/tabs` without changing runtime behavior during PR0.

## How routes are defined in this repo

Movement Engineer does not use a file-system router. Navigation is tab-based and hash-driven:

- `src/app/main.js` bootstraps the app and registers tabs via `registerToolTabs` and `registerCollectionTabs`.
- `src/app/ui/tabManager.js` builds tab buttons and panels in the DOM.
- `src/app/shell.js` activates tabs based on the current hash (`#tab-name`) or the active tab element, and renders the matching tab module.

This means “routes” today are effectively tab IDs, not file paths. The file list below is a best-effort inventory of the modules that participate in tab navigation.

## Current route file tree (`src/app`)

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

**Derived Route Key (best-effort)** assumptions:

- Drop the `src/app` prefix and file extension.
- Ignore route group segments like `(group)` (none currently present).
- Treat `index` and `_layout` as “no segment.”

This key is for collision detection, not a canonical URL map.

| Route File | Type | Derived Route Key (best-effort) | Notes |
| ---------- | ---- | ------------------------------- | ----- |
| `src/app/actions.js` | unknown | `/actions` | Navigation helpers; not a screen on its own. |
| `src/app/main.js` | special | `/main` | App entry point; registers tabs and initializes shell. |
| `src/app/persistenceFacade.js` | unknown | `/persistenceFacade` | Persistence wiring for snapshots. |
| `src/app/shell.js` | layout | `/shell` | Hash/tab activation and tab lifecycle coordinator. |
| `src/app/store.js` | unknown | `/store` | State store implementation. |
| `src/app/tabs/authority.js` | screen | `/tabs/authority` | Tool tab: Authority. |
| `src/app/tabs/calendar.js` | screen | `/tabs/calendar` | Calendar tab module (not registered in `src/app/main.js`). |
| `src/app/tabs/canon.js` | screen | `/tabs/canon` | Tool tab: Library (canon). |
| `src/app/tabs/canon/actions.js` | unknown | `/tabs/canon/actions` | Canon tab helpers. |
| `src/app/tabs/canon/libraryView.js` | unknown | `/tabs/canon/libraryView` | Canon view component. |
| `src/app/tabs/claims.js` | screen | `/tabs/claims` | Collection tab override for `claims`. |
| `src/app/tabs/collectionTabs.js` | group | `/tabs/collectionTabs` | Registers collection tabs from the data model. |
| `src/app/tabs/collections.js` | screen | `/tabs/collections` | Tool tab: Collections. |
| `src/app/tabs/comparison.js` | screen | `/tabs/comparison` | Tool tab: Comparison. |
| `src/app/tabs/dashboard.js` | screen | `/tabs/dashboard` | Tool tab: Dashboard (likely default first tab). |
| `src/app/tabs/entities.js` | screen | `/tabs/entities` | Collection tab override for `entities`. |
| `src/app/tabs/genericCrud.js` | screen | `/tabs/genericCrud` | Feature-flagged tool tab: Generic CRUD. |
| `src/app/tabs/graph.js` | screen | `/tabs/graph` | Tool tab: Graph. |
| `src/app/tabs/graph/workbench.js` | unknown | `/tabs/graph/workbench` | Graph tab helper. |
| `src/app/tabs/media.js` | screen | `/tabs/media` | Collection tab override for `media`. |
| `src/app/tabs/notes.js` | screen | `/tabs/notes` | Notes tab module (not registered in `src/app/main.js`). |
| `src/app/tabs/practices.js` | screen | `/tabs/practices` | Collection tab override for `practices`. |
| `src/app/tabs/rules.js` | screen | `/tabs/rules` | Collection tab override for `rules`. |
| `src/app/tabs/tabKit.js` | unknown | `/tabs/tabKit` | Tab helper utilities. |
| `src/app/tabs/toolTabs.js` | group | `/tabs/toolTabs` | Registers tool tabs (dashboard, canon, graph, etc.). |
| `src/app/ui/chips.js` | unknown | `/ui/chips` | UI utility. |
| `src/app/ui/dom.js` | unknown | `/ui/dom` | DOM helpers. |
| `src/app/ui/hints.js` | unknown | `/ui/hints` | UI hints. |
| `src/app/ui/markdown.js` | unknown | `/ui/markdown` | Markdown modal and preview. |
| `src/app/ui/modelUiHints.js` | unknown | `/ui/modelUiHints` | UI hints for models. |
| `src/app/ui/movements.js` | unknown | `/ui/movements` | Movement selector UI. |
| `src/app/ui/schemaDoc.js` | unknown | `/ui/schemaDoc` | Schema doc helper. |
| `src/app/ui/sections.js` | unknown | `/ui/sections` | UI sections helper. |
| `src/app/ui/status.js` | unknown | `/ui/status` | Status UI. |
| `src/app/ui/tabManager.js` | layout | `/ui/tabManager` | Builds tab buttons/panels and groups. |
| `src/app/ui/table.js` | unknown | `/ui/table` | Table UI helper. |
| `src/app/utils/values.js` | unknown | `/utils/values` | Utility functions. |

## Entry points & assumptions

- **Default start route:** The shell chooses the active tab from the DOM, then falls back to the first tab element if no hash is present (`src/app/shell.js`). Practically, this is usually the first tool tab created in `registerToolTabs` (Dashboard) unless bootstrap options remove it.
- **Tab layout definition:** Tab buttons and panels are created by `src/app/ui/tabManager.js`, which is invoked from `src/app/main.js` before tab registration.
- **Special flows:**
  - Hash-based deep links (`#tab-name`) are supported by the shell.
  - Collection tabs are dynamic: they are created from the current model schema and can change when the model changes (`src/app/tabs/collectionTabs.js`).
  - Feature-flagged tabs (e.g., Generic CRUD) may appear only when the relevant flag is enabled (`src/app/tabs/genericCrud.js`).
