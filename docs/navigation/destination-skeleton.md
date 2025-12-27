# Destination navigation skeleton

## Why these folders exist

The folders `src/app/(app)`, `src/app/(auth)`, and `src/app/(modals)` reserve a future
filesystem-based navigation structure. Parentheses mark route groups, which the
route audit already ignores, so these folders can exist without affecting the
current app behavior.

## Current runtime still uses tabs

Movement Engineer continues to boot and navigate through the tab-based system
in `src/app/tabs`, wired by `src/app/main.js`, `src/app/shell.js`, and
`src/app/ui/tabManager.js`. No production code imports from the new folders yet.

## Placeholder layouts

Each destination folder contains a minimal `_layout.js` placeholder. These files
are inert by design:

- No imports or side effects.
- Export a safe `LayoutPlaceholder` that returns `children` or `null`.
- Used only to signal future structure, not runtime navigation.

## Migration reminder

Behavior must remain identical until a future PR explicitly cuts over to the
new navigation system. Keep the skeleton inert until then.
