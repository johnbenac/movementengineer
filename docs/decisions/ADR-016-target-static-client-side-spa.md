# ADR-016: Target a Static Client-Side SPA

## Status

Accepted

## Context

We need to decide how the Movement Engineer will be delivered and run: as a server-backed web application, a static single-page application (SPA), or some hybrid. The current codebase (data model + view-model builders) is already written as pure JavaScript that can run equally well in the browser or in Node. We now have enough clarity about the desired user experience—local JSON files, import/export, browser-side storage—to choose a delivery model rather than staying ambiguous.

Several forces are at play. We want low operational overhead (no servers to maintain), easy distribution (a single static site that can be hosted anywhere), and a development model that keeps JSON as the primary artifact. We also anticipate users wanting to experiment privately, store their designs in their own file systems or browser storage, and share movement definitions via Git or exported JSON files. At the same time, we don't want to preclude adding a backend later (for collaboration, sharing, or heavy computations), so the chosen architecture should not make that impossible.

Constraints include limited infrastructure assumptions (it should work on simple static hosting), the desire to keep initial complexity low, and the fact that almost all of our logic is already pure and synchronous. There is no requirement today for multi-user real-time collaboration or server-side access control, which are the main drivers for a heavier backend architecture.

## Decision

We will target a **static, client-side single-page application (SPA)** as the primary delivery model for Movement Engineer. All core domain logic (data model, view models, comparison/meta models, and template application) must be runnable entirely in the browser, using only static assets served over HTTP (HTML, CSS, JS, and possibly static JSON). Node and other server runtimes are allowed only for development tasks such as testing, bundling, or building the static bundle—not for core application behavior at runtime.

This means the app will be loadable from a single `index.html` plus associated scripts and styles, with persistence handled through browser capabilities (e.g., `localStorage`, `IndexedDB`) and explicit import/export of JSON files. Any future server-side functionality will be layered on top via APIs, without changing the fundamental guarantee that a user can run the tool as a self-contained static SPA.

## Rationale

A static SPA aligns with the way we are modeling movements: as JSON documents that can be serialized, forked, and versioned in Git. It keeps the deployment story simple: the entire app can be hosted on any static file host (GitHub Pages, S3, Netlify, etc.) or even opened from disk during development. Because our core logic is already pure JS, there is no technical requirement to push computation to a server; moving logic to the browser uses our existing structures as-is.

Alternative architectures—such as a full server-rendered app or a heavy backend API from day one—would introduce operational complexity (databases, hosting, auth) before we know they are needed. They would also blur the boundary between "the JSON spec" and "the live system". By committing to a static SPA now, we retain the option to add a backend later, while avoiding premature infrastructure design. The SPA approach also supports offline or low-connectivity use cases well, which is valuable for a tool that is fundamentally about creative design and personal exploration.

## Consequences

### Positive

* **Simple deployment and hosting:** The entire application can be served as static files from any CDN or static host, with no backend infrastructure required.
* **Offline and private use:** Users can design, save, fork, and export movements entirely in the browser, using local storage and JSON files, without needing an account or an internet-connected server.

### Negative

* **Limited built-in collaboration:** Without a backend, there is no real-time multi-user editing, shared sessions, or central repository of movements managed by the app itself.
* **Client-side performance constraints:** Very large datasets or complex comparisons may be slower or more memory-intensive on low-power devices, since all computation is done in the browser.

### Mitigation

* For collaboration and sharing, rely on **export/import and Git** initially: users can exchange JSON files or point to Git repositories of movements, and later we can add optional backend services (e.g., a "Movement Hub" API) without changing the SPA contract.
