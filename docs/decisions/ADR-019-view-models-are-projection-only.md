# ADR-019: Treat View Models as Projections Only

## Status
Accepted

## Context

As we developed the designer’s UI layer, we needed to decide where data transformation should occur.  Early drafts mixed business rules and view code: some screens fetched and filtered data directly, others computed metrics (counts, histograms) on the client, and some view components performed validation.  This blurred the line between domain logic and presentation and made functions difficult to test.  We also wanted our view models to be stable across UI frameworks (React, Vue or command‑line output) and to serve as well‑defined contracts for the UI.  The question was how much intelligence the view model builders should have: should they interpret business rules (e.g. apply filters), or simply assemble data for display?

## Decision

View model builders are defined as **pure projection functions** that take raw domain data and lightweight inputs and return data transfer objects (DTOs) shaped specifically for a screen.  They perform no side effects, no I/O and no business logic beyond organising data.  They do not interpret rules, enforce policies or perform validation; such work is done in separate service functions.  For example, `buildMovementDashboardViewModel` summarises counts and picks exemplar entities but does not decide if a movement is valid.  Likewise, `buildEntityDetailViewModel` collects related claims and practices but does not infer hierarchies.  View models live in their own module (`view-models.js`) and are the only thing the UI layers call to obtain display data.  Domain services produce view models that cross the movement boundary or apply business logic, and they call view model builders internally when needed.

## Rationale

Treating view models as pure projections ensures the UI is decoupled from domain rules.  It simplifies testing: each builder can be unit‑tested with static input to guarantee a stable output shape.  It also fits our static SPA approach (ADR‑016) because the same view model can drive a browser UI, a CLI tool or a server‑rendered preview.  By centralising business logic in services (e.g. comparison services), we avoid duplicating logic across different views and reduce the risk of inconsistent behaviour.  This decision supports ADR‑017 by keeping domain logic environment‑agnostic and ADR‑018 by allowing meta‑services to produce view models as needed.

## Consequences

### Positive
- View models are deterministic and easy to test; they are free of side effects and external dependencies.
- UI components have a clear contract and do not need to understand domain details beyond what the view model provides.
- Business logic can evolve independently from presentation logic, improving maintainability.

### Negative
- Additional services may be needed to bridge between domain objects and view models when business logic is required (e.g. candidate suggestion, filtering by tags).
- Developers may be tempted to bypass the view model layer and query domain collections directly in the UI if not disciplined.

### Mitigation
- Provide service functions (e.g. ComparisonService, TemplateService) that return ready‑to‑use view models for cross‑movement operations.
- Document guidelines and enforce code reviews to prevent leakage of business logic into the view model builders.