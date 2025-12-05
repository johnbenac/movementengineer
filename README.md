# Movement Engineer

Movement Engineer is a fully client-side tool for exploring, authoring, and comparing structured data about social movements. The app ships as a static single-page experience that runs in the browser, keeping snapshots in `localStorage` while allowing import/export for portability.

## Features
- Browse, edit, and compare movements, entities, practices, events, rules, claims, and sources.
- Persist your work in the browser, or export/import full-fidelity zip projects (with room for media assets) and lightweight JSON snapshots for quick scripting.
- Visualize relationships through the embedded entity graph view.
- Auto-load bundled movement datasets from the `movements/` directory via the generated manifest.
- Lightweight domain and view-model layers decoupled from the UI for easy testing.

## Data model (reader's cut)
If you want to understand what the app actually thinks a “movement” is, here’s the candid tour. The data model is opinionated on purpose: it keeps things small, explicit, and asymmetric so you can model real-world messiness without drowning in cross-links.

- **Movement** is the top-level container. Every other record points back to a movement, and the movement itself keeps almost nothing but a name, short name, summary, notes, and tags. This keeps multi-movement datasets cheap: you can fork a movement and reuse the rest.
- **TextCollection** and **TextNode** handle the written canon. Collections give you named groupings (think “Main Canon” vs. “Ritual Handbook”), while TextNodes form a tree of works → sections → passages → lines. Text nodes own their outbound mentions of entities (one-way), which avoids the bookkeeping hell of inverse references on every entity.
- **Entity** is intentionally generic: beings, places, objects, and ideas all live here with a `kind`, summary, and sources-of-truth fields. Entities can cite other entities as sources, but they don’t store incoming references; relationships are expressed separately as relations.
- **Practice** is for things people do—rituals, disciplines, service, study. Practices point outward to entities involved, instruction texts, and claims, but again we avoid bidirectional clutter. Each practice has a recurrence (`EventRecurrence`) and a public/private flag to hint at how visible it is in communal life.
- **Event** captures specific happenings: who, when (including recurrence), and where. Events can link to entities, practices, claims, and texts, but they don’t try to be a calendar system; they’re more like memory anchors.
- **Rule** represents norms with a graded `RuleKind` from hard “must do” to aspirational “ideal.” Rules point to entities they govern, claims they justify, and texts that authorize them.
- **Claim** is the atomic statement: a boolean assertion that can be supported by texts, entities, or media. Claims can also tag the entities they’re about. Keeping claims separate from rules and practices makes it easier to compare traditions without rewriting history.
- **Relation** is the flexible glue for entity-to-entity links. It’s directional (source → target) and typed, so you can express “teacher of,” “parent of,” or “inspired by” without hardcoding semantics into entities themselves.
- **Media** slots in as linked artifacts—images, audio, video, text, or other—anchored to entities, claims, practices, rules, and events. It doesn’t try to store the asset itself, only references.
- **Source** captures bibliographic-style references with optional free-form notes and links, meant to support claims of authenticity or provenance.
- **Tags** are intentionally simple: arrays of strings on almost everything. There’s no global tag registry; if you want consistency, define your own conventions in your dataset.

A few design convictions show up everywhere:

- **One-way links win.** Texts, practices, rules, events, claims, and media all point to entities, not vice versa. Relations handle entity-to-entity structure. This keeps editing predictable and avoids cascades when you delete or duplicate things.
- **Enums are small and non-ideological.** `EntityKind`, `PracticeKind`, `RuleKind`, `EventRecurrence`, `TextLevel`, `TextFunction`, and `MediaKind` are just enough to keep data comparable without forcing a worldview.
- **IDs are explicit strings.** Everything has an `id` that travels with exports/imports; there’s no hidden database magic. If you copy a practice between movements, you control whether to reuse or regenerate IDs.
- **Text as tree, not blob.** The nested `TextNode` structure favors granular citation—line-level when you need it—while still letting you render entire works.

If you’re building your own dataset, start with a Movement, stub a TextCollection and a few TextNodes, define your key Entities, and only then add Practices, Events, Rules, and Claims. The model rewards incremental layering: sketch the worldview first, then hang behavior, norms, and evidence on top.

## Getting started
This repository is static; you can open `index.html` directly in a browser or serve the directory with any static file host.

1. Clone the repository and change into it.
2. Open `index.html` in your browser, or run a static server (for example, `npx http-server .`) and navigate to the hosted URL.

### Movement data
Bundled datasets live in `movements/*-data.js`. The manifest at `movements/manifest.js` ensures the browser loads each dataset. When you add or rename datasets, regenerate the manifest with:

```bash
node scripts/generate-movement-manifest.js
```

All movement data—bundled samples, localStorage saves, movement exports, and project exports—use the same **Movement Snapshot** JSON shape documented in [`docs/movement-snapshot.md`](docs/movement-snapshot.md). There is no alternative project JSON wrapper; anything “fancier” must compile down to that snapshot.

### Testing
Domain logic tests use simple Node scripts:

```bash
node comparison-services.test.js
node view-models.test.js
```

## License
This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
