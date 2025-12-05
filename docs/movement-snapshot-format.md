# Movement Snapshot: Canonical JSON format

The Movement Engineer data model has exactly one persisted JSON shape, called a **Movement Snapshot**. Every dataset, export, and on-disk artifact that represents project data uses this object structure:

```jsonc
{
  "version": "3.4",          // schema version from data-model.js

  "movements": [],
  "textCollections": [],
  "texts": [],
  "entities": [],
  "practices": [],
  "events": [],
  "rules": [],
  "claims": [],
  "media": [],
  "notes": [],
  "relations": []

  // Optional future meta collections live here too, still as arrays:
  // "comparisonSchemas": [],
  // "comparisonBindings": [],
  // "movementTemplates": []
}
```

## Where this shape appears
- Bundled movement datasets under `movements/*.js` export snapshots exactly in this format (for example `movements/me-too-data.js`).
- `movement-data.js` merges all bundled snapshots and hands them to `StorageService.ensureAllCollections`.
- "Export movement JSON" and "Export project (.json)" both emit this snapshot shape.
- `snapshot.json` inside a project zip (`.movement`) is this same JSON. The extra `manifest.json` in the zip is metadata about the archive, not an alternate schema.

## Import/export rules
- **Canonical export:** JSON exports are just the snapshot object (no wrapper `{ format, data }`).
- **Back-compat:** Import still accepts legacy wrapped JSON and normalizes it through `StorageService.ensureAllCollections`.
- Zip exports continue to include the snapshot as `snapshot.json`, plus per-collection files for convenience.

## Building new movements without new formats
Designers and wizards are view-models only. When users generate data from a form (e.g., the older v2 `{ world, path, people, meta }` object), the UI should **compile** that structure into a Movement Snapshot:

1. Create a new `Movement` row with the name/summary the user provided.
2. Emit related `Entity`, `Practice`, `Claim`, `TextNode`, etc. rows derived from the form inputs.
3. Save/merge that snapshot through `StorageService.saveSnapshot` and allow export/import via the same canonical JSON pipeline.

For cloning or scaffolding new movements, use the existing templating engine in `comparison-services.js` (`applyTemplateToMovement`). Templates themselves can live in code today or, if needed later, as a `movementTemplates` collection inside the snapshot—still the same top-level format.
