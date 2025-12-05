# ADR-017: Require Pure, Environment‑Agnostic Domain Logic

## Context

As the movement engineer evolved from a data specification into a functioning tool, we needed to define how and where core business logic would live.  Early prototypes mixed domain logic into the browser (for example, building view models inline with UI code) or relied on specific Node modules.  This made it difficult to test logic outside the runtime where it was written and blurred the separation between UI concerns and the core model.  We want a tool that can run as a static single‑page application in a browser, but also support command‑line tooling and automated unit tests in Node without rewriting functionality for each environment.  The question was where to put functions that transform the movement model into view data or apply comparison and templating logic: in the UI, in a server, or in a neutral library?

## Decision

All core domain logic—view model builders, comparison helpers and template processors—must be written as **pure, environment‑agnostic functions**.  Such functions take plain JavaScript objects as input and return new objects without side effects or dependencies on the DOM, window, fetch, or file system.  They must not perform I/O or depend on browser APIs.  Instead, any side effects (persistence, user input, network requests) are handled by surrounding layers.  Domain functions may assume Node or browser runtimes only for unit testing and bundling.  This decision applies to both the existing view model builders and new services (e.g. comparison and template services).

## Rationale

Keeping domain logic pure and agnostic maximises portability.  The same functions can be run in the browser (for the SPA), in Node (for tests or batch operations) or future server environments (e.g. an API service).  It prevents business rules from leaking into the UI and makes the system easier to test, since functions can be called directly without mocking external dependencies.  We avoid early coupling to a particular framework (React/Vue) or runtime; the domain layer remains stable even if the rendering technology changes.  This decision also aligns with our choice of a static SPA (ADR‑016) by ensuring that all computation needed by the app can run client‑side.

## Consequences

### Positive
- Domain logic can be reused across environments and tested in isolation.
- Reduces coupling between UI code and model transformations, making refactoring and integration easier.
- Pure functions simplify unit testing and enable static analysis.

### Negative
- Developers must resist the temptation to perform I/O or directly manipulate the DOM within domain functions.
- Passing large datasets through pure functions can be slower than lazily querying them, requiring careful optimisation in the future.

### Mitigation
- Provide clear guidelines and lint rules that prevent the use of browser globals or Node‑specific modules in domain functions.
- For performance‑critical operations, consider adding memoisation or indexing helpers while keeping the core API pure.