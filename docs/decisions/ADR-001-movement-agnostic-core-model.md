# ADR-001: Establish a Movement-Agnostic Core Model

## Status
Accepted

## Context

We needed to define a single data model capable of describing movements with wildly different beliefs, practices and structures.  The designer tool must support real traditions (e.g. Sunni Islam, Catholicism, Confucianism) and invented systems (e.g. Aggie football).  Existing schemas for world movements often bake in assumptions about gods, scripture, or particular cosmologies.  Our goal was to avoid those biases and provide a flexible foundation.  Developers requested a uniform set of entities that would cover everything from gods and saints to ceremonies and sacred texts without hard‑coding denominational logic.

## Decision

We adopted a core model consisting of a handful of generic entities: `Movement`, `TextCollection`, `TextNode`, `Entity`, `Practice`, `Event`, `Rule`, `Claim`, `MediaAsset`, `Note` and (in later revisions) `Relation`.  Each object captures a different facet of a religious system: narratives and canon (`TextNode`), things in the world (`Entity`), actions (`Practice`), times (`Event`), norms (`Rule`), beliefs (`Claim`), media and commentary.  These entities are movement‑agnostic; nothing in the schema dictates that a movement must have a deity, scripture or an afterlife.

## Rationale

Using a small set of universal entities allows us to represent diverse movements without requiring special cases.  A single data layer serves both “high church” systems and minimal ethical codes.  This approach simplifies tooling and fosters comparability because every movement shares the same object types.  By keeping the model neutral, designers can layer specific meaning and nuance through tags, notes and relations rather than complicated inheritance hierarchies.

## Consequences

### Positive
- Works equally well for monotheistic, polytheistic, non‑theistic and secular traditions.
- Simplifies implementation because the same API supports every movement.

### Negative
- Some religious concepts (e.g. prophets vs saints) must be expressed via tags or relations rather than typed fields.
- Scholars may miss the fine distinctions present in theological ontologies.

### Mitigation
- Use tags, free‑text fields and `Relation` objects to capture nuanced classifications.
- Provide guidance and examples to data authors so that they can consistently encode complex traditions within the generic model.
