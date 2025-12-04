# ADR-018: Use Meta‑Models for Comparison and Templates

## Status
Accepted

## Context

When considering cross‑movement functionality, we faced two competing approaches: either bake comparison fields and templating hooks directly into the movement schema, or maintain a clean movement snapshot model and handle cross‑cutting concerns separately.  Some proposals suggested adding a `Group` entity or extra properties on `Practice` and `Entity` to support matching across movements.  Others considered a universal dictionary of keys built into the schema.  These would clutter the core model and introduce theology‑specific assumptions.  At the same time, we needed mechanisms to compare aspects of multiple movements and to scaffold new movements from existing ones without manually reinventing every structure.  The challenge was to enable flexible comparison and templating without sacrificing the neutrality of v3.4.

## Decision

We introduced three **meta‑models**—`ComparisonSchema`, `ComparisonBinding` and `MovementTemplate`—that live outside the core movement model.  A `ComparisonSchema` defines a set of dimensions (keys) for comparing movements, each with information about expected value types.  A `ComparisonBinding` captures the matrix of values for a chosen set of movements against a schema.  A `MovementTemplate` describes how to derive a skeleton movement from an existing one by selecting objects and defining field‑copy rules.  These meta‑models are stored and versioned separately from `Movement` data and operate only via references (IDs) into the core model.  Cross‑movement comparison and templating logic is implemented in services that interpret these meta‑documents; no additional fields are added to the movement schema.

## Rationale

Keeping the v3.4 model focussed on describing a single movement preserves its neutrality (ADR‑001).  By externalising comparison and templating concerns, we avoid imposing a single ontology or fixed set of keys on all movements.  Schemas and bindings can be created or modified on the fly, supporting ad hoc comparisons without pre‑authoring a dictionary for every pair of movements.  Templates allow designers to reuse structural patterns (e.g. saints, feast days) without copying content.  Storing these in their own collections facilitates clear separation of concerns, versioning and tooling—comparison logic can evolve independently of the movement specification.

## Consequences

### Positive
- The core movement schema remains simple and agnostic to cross‑movement semantics.
- Comparison and templating become flexible: multiple schemas and templates can coexist and evolve without schema changes.
- Designers can generate templates and comparisons dynamically in the UI without modifying underlying movement definitions.

### Negative
- Requires additional documents and services to manage schemas, bindings and templates, increasing the number of artefacts in the system.
- Without a central ontology, ad hoc schemas may use different keys for similar concepts, complicating automation.

### Mitigation
- Provide a library of recommended `ComparisonSchema` definitions and template patterns to encourage reuse and consistency.
- Develop tools to help authors merge or align schemas, and to suggest existing keys when creating new schemas.