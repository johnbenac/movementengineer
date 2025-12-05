# ADR-013: Remove `isGeneric` and Infer Generality via Relations

## Context

Earlier iterations of the `Entity` schema included an `isGeneric` boolean to distinguish archetypal or class-like entities (“Sacrament of Eucharist”, “Angel”) from particular instances (“Saint Francis of Assisi”, “The Pope”).  In practice, designers struggled to decide whether certain entities (e.g. “The Pope” as an office) were generic or specific.  The boolean offered no guidance on how to treat generic entities when multiple instances existed or how they related to specific instances.  We realised that a binary flag could not capture the nuances of type–instance relationships or category hierarchies.

## Decision

We removed the `isGeneric` field from the `Entity` schema.  Instead, we encourage designers to use `Relation` records to express “type/instance” or “generalizes” relationships.  For example, a parish named “St. Mary’s Parish” can be connected to a generic “Local Parish” entity via a relation type `instance_of`.  Similarly, a relic or saint can be marked as an instance of a broader category (e.g. `ent-saint-francis` → `ent-saint` with `relationType: instance_of`).  Tags remain available to hint at category (e.g. `"saint"`, `"pope"`, `"place"`).  By examining the graph of relations, tools can infer whether an entity acts as a generic type or a particular instance.

## Rationale

Removing `isGeneric` simplifies the schema and eliminates a confusing field that was interpreted inconsistently.  Relationships are more expressive and maintainable than a single bit: they can convey not only genericity but also taxonomic and hierarchical context.  The designer tool and downstream consumers can detect generality by checking for outgoing `instance_of` or `generalizes` relations, making decisions such as grouping instances under types or applying category‑wide rules.  This aligns with our decision to adopt `Relation` for typed edges and to avoid duplicated flags.

## Consequences

### Positive
- Eliminates ambiguity and reduces errors in determining whether an entity is generic.
- Encourages explicit modelling of type–instance relationships via `Relation` records.
- Keeps the `Entity` schema minimal and reduces boolean clutter.

### Negative
- Tools must perform graph analysis to infer generality, which is more complex than reading a boolean.
- Without guidelines, designers might forget to create `instance_of` relations, making inference difficult.

### Mitigation
- Provide documentation and examples showing when to use `instance_of` and `generalizes` relations.
- Implement lints that warn if an entity with a plural or archetypal name lacks an instance relation.