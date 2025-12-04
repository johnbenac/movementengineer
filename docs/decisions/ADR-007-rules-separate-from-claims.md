# ADR-007: Separate Rule Entity for Prescriptive Statements

## Status
Accepted

## Context

While working on the belief model, we recognised that movements express both **what is** (e.g. "There is one God") and **what ought to be** (e.g. "Keep the Sabbath holy").  Originally we considered representing norms as a special category of `Claim`.  However, mixing prescriptive and descriptive statements made it difficult to enforce different business rules, such as who a directive applies to or which practices are associated with compliance.  Moreover, laws often have structured applicability (e.g. only clergy, only on Fridays) and are supported by specific texts and interpretations.  We needed a first‑class way to capture commands, prohibitions, recommendations and ideals.

## Decision

We introduced a `Rule` entity distinct from `Claim`.  Each rule includes a short summary, a `kind` indicating whether it is a must_do, must_not_do, should_do or ideal, optional details, lists of parties it applies to (`appliesTo`) and domains of life it concerns (`domain`), and `tags`.  It also references the textual and doctrinal support for the rule via `supportingTextIds` and `supportingClaimIds`, links to practices that fulfil the rule via `relatedPracticeIds`, and records sources of truth and authority entities.  Rules are not attached to claims directly but may reference claims for rationale.

## Rationale

Separating rules clarifies the difference between belief and norm.  Tools can handle them differently: for example, enforce schedules for must_do rules or display recommendations separately from mandatory directives.  A structured rule entity allows us to encode who a command applies to (everyone, priests, monastics), what domain it addresses (diet, speech, sexual conduct), and how it connects to practices.  This design supports a wide range of legalistic and ascetic traditions without shoehorning prescriptive content into descriptive fields.

## Consequences

### Positive
- Makes normative content easy to query and present distinct from doctrine.
- Supports complex applicability and domain filtering.
- Maintains clear links between rules, supporting texts, claims and practices.

### Negative
- Authors must decide when a statement is a rule versus a belief; ambiguous cases may be modeled inconsistently.
- Additional data entry overhead: each rule requires fields like appliesTo and domain.

### Mitigation
- Provide modelling guidelines distinguishing beliefs from obligations (e.g. a statement becomes a rule if it instructs behaviour).
- Offer defaults for common appliesTo groups and domains to reduce friction.