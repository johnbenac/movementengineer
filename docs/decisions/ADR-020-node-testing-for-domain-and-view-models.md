# ADR-020: Use Node‑Based Unit Tests for Domain and View Models

## Status
Accepted

## Context

Our movement engineer runs as a static SPA in the browser (ADR‑016) with core logic implemented as pure JavaScript functions (ADR‑017).  Before integrating a GUI or server, we need confidence that the domain model and view model builders behave correctly.  We considered testing in the browser using end‑to‑end frameworks or writing tests in the same environment as the SPA.  Browser testing adds overhead and complexity, especially when our functions have no DOM dependencies.  Node offers a lightweight environment for executing JavaScript and can run on CI without a GUI.  The question was whether to adopt a heavyweight test framework now or to keep tests simple and environment‑agnostic.

## Decision

We will test domain and view model functions using **plain Node‑based unit tests**.  Tests execute the pure functions with sample data loaded into memory, asserting on their outputs.  We do not rely on a browser or a specific UI framework for these tests.  A simple harness (e.g. small scripts or a minimal framework like Jest or Mocha) is sufficient.  Tests live alongside the source or in a `tests` directory and can be run via `node` or `npm test`.  We defer browser and integration testing until the UI is developed.  This decision applies to domain model transformations (e.g. ComparisonServices) and view model builders; they should be testable without mocks of window or fetch.

## Rationale

Using Node for testing aligns with our pure function architecture (ADR‑017) and keeps early iterations frictionless.  We can assert that view models return consistent shapes and that comparison services assemble matrices correctly.  Running tests via Node requires no headless browser, reduces flakiness, and integrates easily into continuous integration pipelines.  By keeping tests simple and environment‑independent, we encourage frequent execution and rapid feedback while the core model stabilises.  Should we later add browser‑specific logic (e.g. IndexedDB, UI state), separate integration tests can cover those aspects.

## Consequences

### Positive
- Tests run quickly and reliably in any environment (CI, local, server) without a browser.
- Encourages pure design of domain functions because they must be testable with plain objects.
- Lowers the barrier for contributions: writing and running tests requires minimal setup.

### Negative
- Node tests cannot catch UI integration bugs or runtime errors that appear only in the browser.
- Developers must create representative sample data for tests; real data and interactions are only covered later with full end‑to‑end tests.

### Mitigation
- After the SPA is built, supplement unit tests with integration tests using a browser environment (e.g. Playwright or Cypress) to validate the complete stack.
- Maintain a library of sample movement datasets and utilities to simplify test authoring.