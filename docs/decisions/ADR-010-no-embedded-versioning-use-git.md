# ADR-010: No Embedded Versioning, Use Git for History

## Status
Accepted

## Context

One of our goals is to allow multiple congregations to run different versions of a movement and to track its evolution over time.  We considered embedding version fields in each entity (e.g. `version`, `createdAt`, `updatedAt`) or building a built‑in branching mechanism into the schema.  Doing so would allow per‑object history within the data itself but would complicate the specification and could lead to merge conflicts.  At the same time, we plan to store movement snapshots in Git repositories and allow patches to modify them.  Git already tracks history, branches and merges.  The question was whether to duplicate that functionality in our data model or rely on the version control system.

## Decision

We decided **not** to include embedded versioning, timestamps or revision tracking inside the movement schema.  The only version field is at the document level (e.g. `version: "3.4"`) to indicate the schema version.  We rely on Git for history, branching and merging of movement snapshots.  Changes to movement data are represented as patches or new snapshots at new commits.  Congruently, we plan to define separate `Patch` and `CommunityConfig` documents to describe deltas and per‑congregation selections rather than embedding these in the core model.

## Rationale

Git provides excellent support for version control, including branching, merging, history and conflict resolution.  Embedding revision fields in every record would duplicate functionality, bloat the schema and increase cognitive overhead for designers.  By treating the JSON file as a snapshot, we keep the data model simple and avoid decisions about how to handle concurrency or partial updates.  History lives in the repository; the schema focuses on representing the movement at a point in time.

## Consequences

### Positive
- Simplifies the schema: no per‑object version numbers or timestamps to manage.
- Delegates history management to Git, which handles branching and merging well.
- Clean separation of concerns: data model for content, Git for versioning.

### Negative
- Tools reading a single snapshot cannot know when changes were made or by whom without referencing the Git log.
- Without embedded revision metadata, cross‑system synchronization requires attention to commit IDs and patch ordering.

### Mitigation
- Provide tooling around Git (e.g. commit messages, release tags) to document significant changes and migrations.
- When cross‑congregation synchronisation is needed, include commit references in patch metadata or `CommunityConfig` files.