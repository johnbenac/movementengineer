# ADR-011: Introduce `Relation` Entity for Typed Links

## Status
Accepted

## Context

During modelling we encountered many relationships between entities that required more detail than a simple list of IDs.  Examples include genealogical links (mother_of, father_of), membership in hierarchies (parish part_of diocese), doctrinal relations (Jesus is second_person_of Trinity), and ontological relationships (host is sacramental_sign_of Christ).  Originally we stored these connections in one large array on each entity (`relatedEntityIds`), but this provided no type information and invited inconsistencies.  Mirroring the same relationship on both entities also led to mismatches.  We needed a structured, extensible way to record typed edges without cluttering the `Entity` schema with dozens of optional fields.

## Decision

We added a new `Relation` entity with fields: `fromEntityId`, `toEntityId`, `relationType` (a free‑form string), `tags`, `supportingClaimIds`, `sourcesOfTruth`, `sourceEntityIds`, and optional `notes`.  Each relation record represents a directed edge between two entities with a semantic meaning.  The `relationType` allows arbitrary values (e.g. “mother_of”, “part_of”, “instance_of”, “sacramental_sign_of”), and the `tags` field can further classify the edge for queries.  Supporting claims and sources provide evidence and authority for the relationship.  Entities no longer have `relatedEntityIds` or mirror these connections; all typed relationships are expressed through the `Relation` collection.

## Rationale

Having a dedicated `Relation` entity lifts semantic connections to first‑class objects, improving clarity and consistency.  It allows the schema to stay minimal and avoids adding special fields to `Entity` for every potential relation type.  The free‑form `relationType` and `tags` make the model extensible to new religious contexts without schema changes.  Storing claims and authority on relations supports rigorous provenance tracking.  Removing mirrored `relatedEntityIds` fields prevents out‑of‑sync links and simplifies maintenance.

## Consequences

### Positive
- Structured edges enable rich graph queries and visualisations (e.g. “show all parent_of relations in this mythos”).
- Eliminates duplication of links across entities and reduces risk of inconsistent data.
- Allows future conventions for relation types without changing the core schema.

### Negative
- Data creators must create separate relation records instead of quickly adding IDs to an array.
- Without a central vocabulary, relationType values may vary across movements; consistent naming conventions need to be agreed upon.

### Mitigation
- Provide a recommended list of common `relationType` values (e.g. parent_of, part_of, instance_of) and encourage consistent use.
- Offer tooling that, when a new relation is created, suggests existing relation types to avoid duplicates.