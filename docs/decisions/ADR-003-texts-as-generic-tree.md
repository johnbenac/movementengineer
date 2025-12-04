# ADR-003: Model Texts as a Generic Tree

## Status
Accepted

## Context

When modelling movements, we realised that sacred and instructional writings come in wildly different formats.  Some movements have canonical books with chapters and verses, others have oral recitations transcribed in scrolls, and some use single prayers or hymns as primary texts.  Our goal was to support any movement without embedding a particular book–chapter–verse pattern.  We also wanted to group related works into collections (like “Bible”, “Main Scriptures”, or “Ritual Handbook”) without forcing every text to belong to a collection.  The decision had to account for nested structures (books contain chapters, which contain passages) and stand‑alone pieces (a one‑line prayer).  The model needed to be flexible enough to represent both long narratives and single instructions while remaining simple for implementers.

## Decision

We defined `TextNode` as a generic hierarchical node with a parent reference and a `level` field describing its scale (`work`, `section`, `passage` or `line`).  Each `TextNode` holds optional content, a title and label, and indicates its main function (story, rule, instructions, teaching, prayer_or_song, commentary, other).  `TextCollection` was introduced as a light grouping mechanism with a name, description and a list of root `TextNode` IDs.  Texts can exist outside collections and collections can group many texts without imposing extra hierarchy.  All cross‑references from texts to other objects (entities, claims) are one‑directional.

## Rationale

By choosing a generic tree with a small set of levels, we avoided hard‑wiring any one movement’s canon structure.  Developers can model Torah scrolls, Vedic hymns, sutras, letters or modern pamphlets using the same API.  Allowing texts outside of collections supports adhoc prayers or instructions.  The flexible `mainFunction` and `tags` fields give downstream tools hints about how to display or process a text without requiring schema changes.  This decision reflects a trade‑off between precision and simplicity: we lose some fidelity about unusual text structures but gain a uniform representation across traditions.

## Consequences

### Positive
- Supports a wide variety of textual traditions without imposing book–chapter–verse assumptions.
- Collections provide a simple way to group texts without affecting hierarchy.
- A uniform API for reading and writing text structures in the designer tool.

### Negative
- Some complex canons (e.g. commentaries on commentaries, interleaved recitations) may require additional conventions beyond the `level` enum.
- Without collections enforcing membership, orphaned texts may be harder to discover without supplemental tooling.

### Mitigation
- Use `tags` on texts to indicate their canonical status or to mark them as instructions or prayers.
- For complex canons, encourage use of the `Relation` entity to model more detailed textual relationships (commentary_on, translation_of) in future versions.