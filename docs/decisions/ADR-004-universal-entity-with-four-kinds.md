# ADR-004: Single Entity Type with Four Kinds

## Status
Accepted

## Context

Early design discussions considered modelling separate types for gods, spirits, ancestors, places, relics, institutions and abstract concepts.  While this granularity could encode theological nuance, it risked exploding the schema into dozens of specialised entity types.  We needed a representation that could cover an incredibly diverse range of beings and things: from the Holy Trinity and kami spirits to stadiums and colours in the Aggie football movement.  The core challenge was to choose a level of abstraction that allowed any religious system to encode its cosmology and ontology consistently without requiring per‑movement schema customisations.

## Decision

We created a single `Entity` record to represent anything that exists in the world of the movement.  It has a `kind` field with four possible values: `being` (gods, spirits, saints, people), `place` (heavens, hells, shrines, stadiums), `object` (relics, artifacts, sacred texts, ritual tools) and `idea` (virtues, laws, abstract principles).  Each entity stores a human‑readable `summary`, free‑form `tags` and lists of `sourceOfTruth` labels and related `sourceEntityIds`.  Rather than embed domain‑specific subtypes, we encourage authors to use `tags` and, when needed, `Relation` records to capture finer distinctions such as “angel”, “institution” or “sacrament”.

## Rationale

Choosing a single entity type keeps the schema small and implementation simple.  By consolidating beings, places, objects and ideas into one table with a `kind` field, we avoid proliferating special case entity schemas for each tradition.  The four kinds reflect very general categories that hold across cultures.  Additional nuance can be expressed via tagging (`"saint"`, `"kami"`, `"parish"`) or via `Relation` edges (e.g. `instance_of`).  This generic approach better supports our designer tool, which needs to work with unknown or invented traditions.

## Consequences

### Positive
- A universal entity schema simplifies storage, queries and UI code.
- Frees the model from theological commitments about how many layers of beings exist.
- Encourages consistency in representing any cosmological or social structure through `Relation` rather than type proliferation.

### Negative
- Fine distinctions (e.g. angel vs spirit vs demon) must be conveyed via tags or relations rather than separate fields, making automated reasoning about roles harder.
- Entities representing human institutions (churches, dioceses) and metaphysical beings share the same table; naive consumers may confuse them without additional context.

### Mitigation
- Document recommended tags (`"angel"`, `"parish"`, `"virtue"`) and `relationType` values to assist developers in interpreting entity meaning.
- Provide validation tooling to check for common modelling errors, such as misclassifying institutions as `place` instead of `being` or `idea`.