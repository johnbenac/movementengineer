# Movement Engineer

Movement Engineer is a fully client-side tool for exploring, authoring, and comparing structured data about social movements. The app ships as a static single-page experience that runs in the browser, keeping snapshots in `localStorage` while allowing import/export for portability.

## Features
- Browse, edit, and compare movements, entities, practices, events, rules, claims, and sources.
- Persist your work in the browser or export/import JSON snapshots for sharing and backups.
- Visualize relationships through the embedded entity graph view.
- Auto-load bundled movement datasets from the `movements/` directory via the generated manifest.
- Lightweight domain and view-model layers decoupled from the UI for easy testing.

## Getting started
This repository is static; you can open `index.html` directly in a browser or serve the directory with any static file host.

1. Clone the repository and change into it.
2. Open `index.html` in your browser, or run a static server (for example, `npx http-server .`) and navigate to the hosted URL.

### Movement data
Bundled datasets live in `movements/*-data.js`. The manifest at `movements/manifest.js` ensures the browser loads each dataset. When you add or rename datasets, regenerate the manifest with:

```bash
node scripts/generate-movement-manifest.js
```

### Testing
Domain logic tests use simple Node scripts:

```bash
node comparison-services.test.js
node view-models.test.js
```

## License
This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
