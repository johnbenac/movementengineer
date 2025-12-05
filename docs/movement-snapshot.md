# Movement Snapshot (Canonical JSON Format)

Movement Engineer persists projects, datasets, and exports as a **single JSON shape** called a _Movement Snapshot_. All other wrappers (zip manifests, browser blobs, etc.) are just packaging around this object.

```jsonc
{
  "version": "3.4",
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
}
```

* `data-model.js` defines the schema for each collection. When you add new collections (for example `movementTemplates` or `comparisonSchemas`), they become additional top-level arrays in the same snapshot object.
* Static datasets (`movements/*-data.js`), in-memory defaults (`movement-data.js`), localStorage saves, and all import/export surfaces treat this shape as the **only persisted data model**.

## Import/Export rules

* **Project JSON** (`Export project (.json)`): exports the normalized snapshot directly (no wrapper object). The importer still accepts the legacy wrapped format `{ format: "json", data: { ...snapshot } }` for backwards compatibility.
* **Movement JSON** (`Export movement JSON`): the same snapshot shape, usually scoped down to a single movement and its related records.
* **Project ZIP / .movement**: `snapshot.json` inside the archive is the same canonical snapshot. `manifest.json` only describes the archive contents; it is not a second data format.

## Building new movements without creating new formats

Designers and wizards are **compilers** into the snapshot shape:

1. Let authors work in whatever UI-friendly form state they need (e.g., a v2 designer object with `world`, `path`, `people`).
2. When they click save/generate, translate that state into a new Movement Snapshot:
   * Create a `Movement` row.
   * Emit related `Entity`, `Practice`, `Claim`, `TextNode`, etc. records that reflect the designer inputs.
3. Persist/export that snapshot through `StorageService` and `ProjectIO` like any other dataset.
4. If you want reusable starters, use the existing template engine (`comparison-model.js` + `comparison-services.js#applyTemplateToMovement`) to clone structures. Templates themselves can live in code today, or later as another collection (e.g., `movementTemplates`) inside the same snapshot.

There is no separate persisted JSON schema for design-time data—the snapshot is the source of truth everywhere.
