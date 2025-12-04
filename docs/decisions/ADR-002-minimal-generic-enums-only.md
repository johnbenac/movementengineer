# ADR-002: Use Minimal Generic Enums Only

## Status
Accepted

## Context

Early iterations of the movement data model tried to enumerate every conceivable classification.  We sketched axes for metaphysics, eschatology, ritual density and dozens of other theology‑centric distinctions.  While comprehensive in theory, this proliferation of enums made the schema heavy, biased toward particular traditions, and intimidating for users.  Each new movement or sect would inevitably demand more categories, leading to an explosion of special cases.  At the same time the user audience for our designer tool was broader than professional theologians; we needed something intuitive.

As we began populating the schema with concrete examples—from Aggie football fandom to Sunni Islam—we noticed that most objects only needed a handful of simple categories: the size of a text, the type of practice, the recurrence of an event and so on.  The rest could be expressed with free‑form tags or left implicit.  We also considered a future where movements could be compared statistically; a smaller set of stable enums would make that easier.

## Decision

We decided to prune the enumeration space to a handful of generic, easily understood enums.  The schema retains `TextLevel`, `TextFunction`, `EntityKind`, `PracticeKind`, `RuleKind`, `EventRecurrence` and `MediaKind` with a small set of plain‑language values.  All other categorizations—metaphysical orientations, scriptural origins, canon openness and so forth—are represented using free‑text fields and tags rather than rigid enums.  In future releases we may publish guidelines on tag usage, but the core schema will remain light.

## Rationale

Reducing the number of enums makes the schema more approachable and adaptable.  It avoids embedding a particular theological worldview into the structure, thereby honouring the project’s movement‑agnostic aspirations.  It also allows designers to classify their content in their own words without waiting for schema changes.  From a tooling perspective, fewer enums means simpler validation and fewer migrations when the schema evolves.

## Consequences

### Positive
- The model is easier for non‑experts to understand and populate.
- Schema evolution is simpler because we avoid long enum lists that require versioning.
- Free‑text tags allow limitless nuance without formal approval.

### Negative
- Analytic comparisons become less standardized because tags may vary in spelling or meaning.
- Without guided enums, designers may create inconsistent classification vocabularies across movements.

### Mitigation
- Provide documentation with recommended tags for common concepts as conventions, not schema.
- Develop optional linting tools that flag similar but inconsistent tags and suggest normalization, without making it a core requirement.
