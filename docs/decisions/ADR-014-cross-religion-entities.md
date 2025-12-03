# ADR-014: Allow Cross‑Religion Entities via Nullable `religionId`

## Status
Accepted

## Context

Some entities and claims transcend individual religions: figures like Abraham or Mary are revered in multiple traditions; philosophical concepts like karma or the golden rule may appear in divergent systems; and certain objects like the Earth or the sky are universal.  In the initial model, every `Entity`, `Claim` and `MediaAsset` was required to have a `religionId`.  This forced duplication when the same entity or belief was referenced by multiple religions, complicating maintenance and patching.  We needed a way to represent shared concepts while still supporting tradition‑specific variations.

## Decision

We changed `religionId` to be **nullable** on selected collections: `Entity`, `Claim`, `MediaAsset`, `Note` and `Relation`.  When `religionId` is `null`, the record is considered **global** or **shared** and may be referenced by multiple religions.  Other collections (`Practice`, `Event`, `Rule`, `TextNode`, `TextCollection`) still require a `religionId` because they embody tradition‑specific actions, times and instruction sequences.  Tools may group global entities in a separate namespace or library.  Religion snapshots can refer to these shared entities via IDs without duplicating them.

## Rationale

Allowing global entities and claims reduces duplication and encourages consistency across religions that draw from common sources.  Nullable `religionId` signals to developers and data authors that some concepts are outside the exclusive scope of any one system.  Concretely, this design supports modelling figures like Jesus or Mary across multiple Christian traditions or shared mythological motifs in syncretic religions.  It also simplifies linking when new religions are designed that reuse existing concepts.

## Consequences

### Positive
- Avoids duplicating identical entity or claim definitions across religion files.
- Supports cross‑religion comparisons and reuse of global concepts.
- Keeps the core collections consistent for tradition‑specific content (practices, rules, texts remain scoped).

### Negative
- Distinguishing shared vs specific content adds some complexity to data management and requires careful naming and IDs.
- Merging a shared library with a religion snapshot may require conflict resolution if local variations exist.

### Mitigation
- Document guidelines on when to set `religionId: null`, and encourage using tags to clarify scope (e.g. `"shared"`, `"global"`).
- Provide tooling to import shared libraries into religion projects and to override or extend shared entities when necessary.