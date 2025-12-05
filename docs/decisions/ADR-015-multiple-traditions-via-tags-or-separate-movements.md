# ADR-015: Represent Multiple Traditions Using Tags or Separate Movements

## Context

Religious families often contain diverse schools, denominations or sects.  For example, Sunni and Shia Islam have different doctrines and practices; Catholicism, Orthodoxy and Protestantism diverge on theology and liturgy; the Dharma traditions include Theravada, Mahayana and Vajrayana.  We considered adding a `Group` or `Tradition` entity to model substructures within a movement.  However, adding another major entity type would complicate the core schema.  At the same time, not capturing internal diversity would flatten distinct traditions into one generic definition.  We needed a strategy to represent multiple traditions without proliferating top‑level entities.

## Decision

Instead of introducing a dedicated `Group` entity, we opted for two flexible patterns:

1. **Separate Movement Records**: For major denominational differences, create distinct `Movement` entries (e.g. `rel-sunni`, `rel-shia`) with their own texts, claims, rules, practices and events.  Shared entities and claims can be referenced via the nullable `movementId` feature (see ADR‑014).

2. **Tags on Records**: For smaller variations or overlapping schools within one movement file, use the `tags` field on `Claim`, `Rule`, `Practice`, `Event`, etc., to indicate the applicable tradition (e.g. tags: ["hanafi"], ["neo_confucian"], ["western_rite"]).  Tools can filter or display content by these tags.

These patterns can be combined: separate movements for broad splits and tags for sub‑schools.  We explicitly chose not to add a `Group` entity because most differences can be modeled through these mechanisms and through the patch/branch system provided by Git.

## Rationale

Separate `Movement` entries give the clearest separation where theology and liturgy diverge significantly.  Tags allow finer granularity without cluttering the schema.  This approach maintains a simple core model while still accommodating multiple traditions.  It also fits our Git-based approach, where different congregations or sects can maintain their own snapshots or branches of a base movement.  Avoiding a dedicated `Group` entity keeps the schema from becoming too hierarchical and complex at this stage.

## Consequences

### Positive
- Flexible modelling of diversity without adding new entity types.
- Aligns with the patch and branching workflow for multiple congregations.
- Tags provide a simple way to filter and display sect‑specific content.

### Negative
- Tags are free‑form; inconsistent naming may hinder querying across movements.
- Separate movement files may duplicate similar content when differences are small.

### Mitigation
- Establish naming conventions for tradition tags and document them (e.g. use recognised names like "maliki", "gelug" consistently).
- Use shared entities and claims (ADR‑014) to reduce duplication across related movement snapshots.