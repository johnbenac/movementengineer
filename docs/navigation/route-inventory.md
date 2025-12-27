# Route inventory (PR0)

## Purpose

This document is a factual snapshot of how navigation works today. It exists to support the
multi-PR migration away from `src/app/tabs` while preserving behavior.

## How routes are defined in this repo

Movement Engineer does **not** use file-based routing. Navigation is implemented as a tab system:

- The tab panels are authored in `index.html` (e.g., `<section id="tab-dashboard" ...>`),
  which provides the initial DOM structure and the default active tab state.
- `src/app/ui/tabManager.js` builds the tab buttons for the toolbar groups.
- `src/app/shell.js` reads the active tab from the DOM or the URL hash and mounts/renders the
  corresponding tab module registered in `window.MovementEngineer.tabs`.
- `src/app/tabs/*.js` modules register tab renderers (and some helper modules support those tabs).

Because of this, the “route files” below are an inventory of the current tab modules and related
navigation helpers, not a file-router hierarchy.

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

**Derived Route Key (best-effort)** is a normalized identifier used by the audit script to detect
collisions. It is not a guarantee of a real URL and makes these assumptions:

- Uses file paths under `src/app` rather than actual runtime URLs.
- Strips extensions, drops `index`, and removes route group segments like `(group)`.
- Preserves dynamic-looking segments (none exist today).

| Route File | Type | Derived Route Key (best-effort) | Notes |
| ---------- | ---- | ------------------------------- | ----- |
| `src/app/actions.js` | unknown | `/actions` | Action creators used by tab interactions. |
| `src/app/main.js` | special | `/main` | Application bootstrap + tab registration entrypoint. |
| `src/app/persistenceFacade.js` | unknown | `/persistenceFacade` | Persistence wiring for snapshot storage. |
| `src/app/shell.js` | special | `/shell` | Tab router: hash + DOM-driven navigation controller. |
| `src/app/store.js` | unknown | `/store` | App state container. |
| `src/app/tabs/authority.js` | screen | `/tabs/authority` | Tool tab module (Authority). |
| `src/app/tabs/calendar.js` | screen | `/tabs/calendar` | Tab module (Calendar). |
| `src/app/tabs/canon.js` | screen | `/tabs/canon` | Tool tab module (Library/Canon). |
| `src/app/tabs/canon/actions.js` | unknown | `/tabs/canon/actions` | Canon tab helper actions. |
| `src/app/tabs/canon/libraryView.js` | unknown | `/tabs/canon/libraryView` | Canon tab view helper. |
| `src/app/tabs/claims.js` | screen | `/tabs/claims` | Collection tab module (Claims). |
| `src/app/tabs/collectionTabs.js` | group | `/tabs/collectionTabs` | Builds collection tabs dynamically from the model. |
| `src/app/tabs/collections.js` | screen | `/tabs/collections` | Tool tab module (Collections). |
| `src/app/tabs/comparison.js` | screen | `/tabs/comparison` | Tool tab module (Comparison). |
| `src/app/tabs/dashboard.js` | screen | `/tabs/dashboard` | Tool tab module (Dashboard). |
| `src/app/tabs/entities.js` | screen | `/tabs/entities` | Collection tab module (Entities). |
| `src/app/tabs/genericCrud.js` | unknown | `/tabs/genericCrud` | Generic CRUD tab helper for collection tabs. |
| `src/app/tabs/graph.js` | screen | `/tabs/graph` | Tool tab module (Graph). |
| `src/app/tabs/graph/workbench.js` | unknown | `/tabs/graph/workbench` | Graph tab workbench helpers. |
| `src/app/tabs/media.js` | screen | `/tabs/media` | Collection tab module (Media). |
| `src/app/tabs/notes.js` | screen | `/tabs/notes` | Collection tab module (Notes). |
| `src/app/tabs/practices.js` | screen | `/tabs/practices` | Collection tab module (Practices). |
| `src/app/tabs/rules.js` | screen | `/tabs/rules` | Collection tab module (Rules). |
| `src/app/tabs/tabKit.js` | unknown | `/tabs/tabKit` | Tab builder helpers. |
| `src/app/tabs/toolTabs.js` | group | `/tabs/toolTabs` | Registers the tool tab set. |
| `src/app/ui/chips.js` | unknown | `/ui/chips` | UI helper (chips). |
| `src/app/ui/dom.js` | unknown | `/ui/dom` | DOM utilities used across tabs. |
| `src/app/ui/hints.js` | unknown | `/ui/hints` | UI helper for hints. |
| `src/app/ui/markdown.js` | unknown | `/ui/markdown` | Markdown preview + modal helpers. |
| `src/app/ui/modelUiHints.js` | unknown | `/ui/modelUiHints` | UI hints for model info. |
| `src/app/ui/movements.js` | unknown | `/ui/movements` | Movement list sidebar UI. |
| `src/app/ui/schemaDoc.js` | unknown | `/ui/schemaDoc` | Schema doc helpers. |
| `src/app/ui/sections.js` | unknown | `/ui/sections` | UI section helpers. |
| `src/app/ui/status.js` | unknown | `/ui/status` | Status banner + fatal error UI. |
| `src/app/ui/tabManager.js` | unknown | `/ui/tabManager` | Tab button + panel management. |
| `src/app/ui/table.js` | unknown | `/ui/table` | Table UI helper. |
| `src/app/utils/values.js` | unknown | `/utils/values` | Value helpers used by tabs. |

## Entry points & assumptions

- **Default start route:** The shell chooses the currently active tab panel or hash. With no hash,
  it selects the first tab button in the DOM. The default active panel in `index.html` is
  `#tab-dashboard`, so the app effectively starts on **Dashboard**.
- **Tab layout definition:** Panel layout lives in `index.html` (`#tabs-nav`, `#tabs-panels`),
  while tab button creation is handled by `src/app/ui/tabManager.js` and tab registration occurs
  in `src/app/main.js`.
- **Special flows:** Tab changes are hash-aware (`#<tabName>`) and driven by the shell in
  `src/app/shell.js`. There is no separate auth gating or modal routing system defined in
  `src/app` today.
