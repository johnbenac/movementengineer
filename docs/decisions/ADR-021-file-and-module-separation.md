# ADR-021: Maintain Clear File and Module Separation

## Status
Accepted

## Context

As the project grew from a single schema file into multiple layers of logic, we began to accumulate various concerns—core data modelling, view model projections, comparison meta‑models and domain services.  Early prototypes placed everything in one or two large files, mixing entity definitions with utility functions and tests.  This made it difficult to reason about dependencies and to on‑board new contributors.  Without clear boundaries, domain logic risked creeping into the view layer or vice versa.  We needed a consistent structure to organise files and modules in a way that reflects their roles and dependencies.  Several conventions exist in the JavaScript ecosystem (index files, barrelling, etc.), but we wanted a pattern tailored to our project’s needs.

## Decision

We adopt a **file and module separation convention** based on layers:

1. **Schema definitions** live in their own modules: `data-model.js` defines the core movement schema; `comparison-model.js` (ADR‑018) defines comparison and template meta‑models.  These files contain no logic, only declarative schemas.
2. **Domain logic** lives in service modules: `view-models.js` contains pure projection functions (ADR‑019); future files like `comparison-services.js` will implement comparison and template operations (ADR‑018).
3. **Tests** live alongside code or in a `tests` directory, and are executed via Node (ADR‑020).
4. **Documentation** lives in `docs/decisions` as Architectural Decision Records and in other markdown files for usage notes.

Modules must not import from layers above them.  For example, `data-model.js` imports nothing from view models or services; view model builders import only the data model; services may import both data and meta‑models but not the UI.  This separation guides dependencies and makes it clear where new code should reside.

## Rationale

Explicitly separating files by purpose enforces the boundaries set by our other architectural decisions.  It makes the repository easier to navigate: developers can locate schemas, services and projections without sifting through large monolithic files.  This also supports automated tooling—script generation, code linting and module graph analysis.  Clear module boundaries reduce the chance of accidentally mixing concerns and encourage the addition of new modules as the domain grows (e.g. a `template-services.js`).  By documenting this structure now, we avoid ad hoc file organisation and set expectations for future contributors.

## Consequences

### Positive
- Easier to maintain and extend: each file has a clear responsibility.
- Supports layering rules: domain logic does not leak into view models, and meta models remain separate.
- Simplifies dependency management and allows tree‑shaking if we build a bundle.

### Negative
- Requires discipline: new features must choose the right file or create a new one rather than adding to existing files.
- Splitting into multiple modules can feel fragmented for small features; developers must manage imports.

### Mitigation
- Provide a high‑level README or code map explaining where different concerns live and how to add new modules.
- Use simple naming conventions (e.g. `*-model.js` for schemas, `*-services.js` for logic, `view-models.js` for projections) to aid discovery.