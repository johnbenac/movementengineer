# ADR-012: Canonical Direction for Cross‑Object Links

## Context

In earlier versions of the schema, we mirrored relationships between objects: `Entity` had arrays such as `relatedTextIds`, `relatedPracticeIds` and `relatedEventIds`, while `TextNode` stored `mentionsEntityIds`, `Practice` stored `involvedEntityIds` and so on.  Maintaining these bidirectional links led to mismatches: items were linked in one direction but not the other.  We debated introducing validation to keep them in sync or removing one side of each relationship.  Since our tools can derive reverse associations at runtime, it was unnecessary for authors to manually maintain both directions.  The schema needed a clear rule to prevent inconsistency and cognitive load.

## Decision

We selected a **canonical direction** for every cross‑object relationship and removed mirror fields.  The guiding principle is “from the smaller to the larger context.”  Specifically:

- `TextNode` lists `mentionsEntityIds` to indicate which entities appear in the text; entities do *not* list which texts mention them.
- `Practice` lists `involvedEntityIds`, `instructionsTextIds` and `supportingClaimIds`; entities, texts and claims do *not* mirror these links.
- `Event` lists `mainPracticeIds`, `mainEntityIds`, `readingTextIds` and `supportingClaimIds`; practices, entities, texts and claims do *not* mirror these links.
- `Claim` lists `sourceTextIds` and `aboutEntityIds`; texts and entities do *not* list which claims are drawn from them.
- `MediaAsset` lists IDs of all objects it depicts or relates to; objects do not list media.
- Typed entity relationships are stored via the `Relation` entity only.

This cardinality rule applies to all future relationships unless explicitly stated otherwise.

## Rationale

Maintaining bidirectional fields is error‑prone and redundant when the reverse association can be computed from existing data.  For instance, to find all texts mentioning a given entity, one can query all `TextNode` objects whose `mentionsEntityIds` contain that entity’s ID.  Eliminating redundant fields reduces the surface for inconsistency and simplifies data entry.  Selecting a single cardinal direction clarifies modelling guidelines: authors always know which record holds the reference.

## Consequences

### Positive
- Eliminates mismatches between mirrored fields and reduces manual maintenance.
- Simplifies schema and documentation: each relationship is stored in exactly one place.
- Facilitates automatic derivation of reverse lookups via queries.

### Negative
- Some queries may be less efficient, as the tool must scan or index other collections to find reverse links.
- Users accustomed to seeing “related objects” on both sides might need to adjust to the new directionality.

### Mitigation
- Provide helper functions or indexes in the movement engineer and backend to quickly answer reverse lookups (e.g. find all events involving this entity).
- Clearly document the canonical direction for each relationship type and update sample data accordingly.