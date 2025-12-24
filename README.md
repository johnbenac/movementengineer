# Movement Engineer

Movement Engineer is a fully client-side tool for exploring, authoring, and comparing structured data about social movements. The app ingests **Markdown repositories that follow the v2.3 data specification**, compiling them into the runtime dataset used by the UI and view models.

## Features
- Browse, edit, and compare movements, entities, practices, events, rules, claims, media, and notes.
- Load markdown-based datasets from GitHub or the local filesystem (spec v2.3). No JSON import/export paths remain in the runtime pipeline.
- Visualize relationships through the embedded entity graph view.
- Lightweight domain and view-model layers decoupled from the UI for easy testing.

---

## Quickstart

### Option A: run a local dev server (recommended)
This avoids common `file://` fetch/CORS restrictions and matches how e2e tests run.

```bash
npm install
node tools/dev-server.js
# open http://127.0.0.1:4173
```

### Option B: open the static build directly
You can open `index.html` directly in a browser, or serve the directory with any static file host.

---

## Loading / authoring movement data (Markdown v2.3)

Movement datasets are authored as Markdown files under a `data/` directory that matches the v2.3 spec. Each collection lives in its own folder
(for example `data/movements`, `data/entities`, `data/texts`, etc.), with YAML front matter describing fields and Markdown bodies providing long-form text.

On first load, the app fetches the Upside dataset from this repository. You can point the UI at any other spec-compliant repo via **Load markdown repo**
in the dashboard.

Collections in the v2.3 model:

- `movements` - top-level containers
- `textCollections` / `texts` - hierarchical text nodes with parent references
- `entities` - beings, places, objects, ideas (with `kind` field)
- `practices` - rituals, disciplines, activities
- `events` - happenings with recurrence patterns
- `rules` - norms with graduated `RuleKind`
- `claims` - boolean assertions with sources
- `media` - linked artifacts (images, audio, video)
- `notes` - annotations on any record type

---

## Data model (reader's cut)
If you want to understand what the app actually thinks a “movement” is, here’s the candid tour. The data model is opinionated on purpose: it keeps things small, explicit, and asymmetric so you can model real-world messiness without drowning in cross-links.

- **Movement** is the top-level container. Every other record points back to a movement, and the movement itself keeps almost nothing but a name, short name, summary, notes, and tags. This keeps multi-movement datasets cheap: you can fork a movement and reuse the rest.
- **TextCollection** and **TextNode** handle the written canon. Collections give you named groupings (think “Main Canon” vs. “Ritual Handbook”), while TextNodes form a tree whose depth is derived from parent references (root = depth 0). Text nodes own their outbound mentions of entities (one-way), which avoids the bookkeeping hell of inverse references on every entity.
- **Entity** is intentionally generic: beings, places, objects, and ideas all live here with a `kind`, summary, and sources-of-truth fields. Entities can cite other entities as sources, but they don’t store incoming references; connections are derived from outward references in texts, events, practices, claims, and media.
- **Practice** is for things people do—rituals, disciplines, service, study. Practices point outward to entities involved, instruction texts, and claims, but again we avoid bidirectional clutter. Each practice has a recurrence (`EventRecurrence`) and a public/private flag to hint at how visible it is in communal life.
- **Event** captures specific happenings: who, when (including recurrence), and where. Events can link to entities, practices, claims, and texts, but they don’t try to be a calendar system; they’re more like memory anchors.
- **Rule** represents norms with a graded `RuleKind` from hard “must do” to aspirational “ideal.” Rules point to entities they govern, claims they justify, and texts that authorize them.
- **Claim** is the atomic statement: a boolean assertion that can be supported by texts, entities, or media. Claims can also tag the entities they’re about. Keeping claims separate from rules and practices makes it easier to compare traditions without rewriting history.
- **Media** slots in as linked artifacts—images, audio, video, text, or other—anchored to entities, claims, practices, rules, and events. It doesn’t try to store the asset itself, only references.
- **Tags** are intentionally simple: arrays of strings on almost everything. There’s no global tag registry; if you want consistency, define your own conventions in your dataset.

A few design convictions show up everywhere:

- **One-way links win.** Texts, practices, rules, events, claims, and media all point to entities, not vice versa. The graph view is built from those references, not from a separate relations table. This keeps editing predictable and avoids cascades when you delete or duplicate things.
- **Enums are small and non-ideological.** `EntityKind`, `PracticeKind`, `RuleKind`, `EventRecurrence`, `TextFunction`, and `MediaKind` are just enough to keep data comparable without forcing a worldview.
- **IDs are explicit strings.** Everything has an `id` that travels with exports/imports; there’s no hidden database magic. If you copy a practice between movements, you control whether to reuse or regenerate IDs.
- **Text as tree, not blob.** The nested `TextNode` structure favors granular citation—line-level when you need it—while still letting you render entire works. Depth is always derived; any legacy `level` labels in data are ignored.

If you’re building your own dataset, start with a Movement, stub a TextCollection and a few TextNodes, define your key Entities, and only then add Practices, Events, Rules, and Claims. The model rewards incremental layering: sketch the worldview first, then hang behavior, norms, and evidence on top.

---

## Development

### Build & test

```bash
npm install              # also installs Playwright browsers
npm test                 # node checks + unit + e2e
npm run test:unit        # Vitest only
npm run test:e2e         # Playwright e2e
npm run test:smoke       # quick: unit + smoke e2e
npm run build            # production build + legacy checks
```

### Running individual tests

```bash
npx vitest run tests/unit/app/tabs/dashboard.test.js
npx playwright test tests/e2e/smoke.spec.ts

# e2e with specific entry point
ME_E2E_ENTRY=/index.html npx playwright test tests/e2e/smoke.spec.ts
```

---

## Architecture (high level)

Core layers:

1. **Data Layer** (`src/core/markdownDatasetLoader.js`): compiles Markdown + YAML frontmatter into normalized data, supports GitHub and local sources, validates references.
2. **View Models** (`src/core/viewModels.js`): pure transforms from snapshot → UI-friendly shapes.
3. **Store** (`src/app/store.js`): pub/sub state container (`snapshot`, `currentMovementId`, dirty flags, navigation).
4. **Shell** (`src/app/shell.js`): tab navigation controller + lifecycle + hash routing.
5. **Tabs** (`src/app/tabs/`): feature modules registered on `window.MovementEngineer.tabs`.

Repo map (partial):

```
src/app/
  main.js          # bootstrap + ctx creation + tab registration
  store.js         # state management
  shell.js         # tab navigation
  actions.js       # navigation action creators
  tabs/            # feature modules
  ui/              # shared UI utilities
  utils/           # value helpers

src/core/markdownDatasetLoader.js  # data compilation (browser + Node)
src/core/viewModels.js             # snapshot -> UI transformation
src/models/comparisonModel.json    # movement comparison schema
src/runtime/storageService.js      # LocalStorage persistence
```

For tab module conventions, see `src/app/tabs/README.md`.

---

## Contributing

- If you change code, run the full test suite (`npm test`) before opening a PR.

---

## PR batch diff automation
You can generate comparison reports for ranges of pull requests directly from the GitHub web UI.

1. Open the **Actions** tab and choose **PR Batch Big Picture**.
2. Click **Run workflow**, then provide `start_pr`, `end_pr`, and (optionally) override the `base_branch` or `remote`.
3. The workflow checks out the base branch, pulls each PR branch (falling back to the PR ref when needed), gathers all changed files and PR comments, and writes:
   - Per-PR diff files with contextual headers and the full comment transcript.
   - A master comparison file combining all requested PRs.
   - A touched-files compilation that lists each unique file modified across the PR range (one copy per path, from the base branch) followed by the combined diff report.
4. Download the generated artifact `pr-comparison-{start}-{end}` to retrieve the reports.
