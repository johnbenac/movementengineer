# ADR-008: Sources of Truth as Free Strings and Entity Links

## Context

Different religious traditions claim authority from wildly diverse sources: divine revelation, human prophets, community traditions, personal experience, empirical observation and more.  Early on, we considered defining a fixed enumeration of authority types (e.g. SUPERNATURAL_BEING, HUMAN_AUTHORITY, COMMUNITY_TRADITION, INDIVIDUAL_PERSON, OBSERVATION_OR_REASON).  However, such a list would be arbitrary and limiting.  New movements created with the designer could derive authority from unexpected places such as random number generators or specific objects.  We wanted a flexible mechanism to capture provenance of truth claims, rules, practices and entities without boxing authors into a narrow taxonomy.

## Decision

Instead of using a strict enum, we added two fields to several entity types (Claims, Rules, Practices, Entities, Relations): `sourcesOfTruth` and `sourceEntityIds`.  `sourcesOfTruth` is a free‑form array of strings where authors can write labels like "Bible", "God", "elders", "scientific consensus", or "tea leaves".  `sourceEntityIds` is an array of links to `Entity` records representing concrete authorities or communities (e.g. “Council of Nicaea”, “Prophet Muhammad”, “Local Elder Board”).  These fields are optional and can be left empty when the origin is undefined or uninterpreted.  The schema imposes no canonical list; semantics are up to the movement engineer.

## Rationale

By adopting free text for sources of truth we avoid imposing theological categories on users.  It supports highly unusual systems and fictional movements, allowing anything to be declared a source.  Linking to authority entities provides structure where it matters: if a prophet or council is itself represented as an entity, we can trace lines of inspiration.  This approach emphasises that our tool is descriptive and creative, not normative.  Downstream analysis can still group sources by conventions or heuristics, but the schema remains open.

## Consequences

### Positive
- Unlimited flexibility: any origin story or authority structure can be expressed.
- Supports unconventional or playful movements without schema changes.
- Authority links to entities enable graph exploration of influence.

### Negative
- Lack of structured categorisation makes cross‑movement comparison of authority types harder.
- Without guidelines, designers might record sources inconsistently (e.g. "Bible" vs "Holy Canon").

### Mitigation
- Provide documentation encouraging consistent labelling and recommending linking to entities where appropriate.
- Analytical tools can classify `sourcesOfTruth` post‑hoc according to developer‑defined categories when needed.