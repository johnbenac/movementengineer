# ADR-009: Use JSON as the Canonical Format

## Status
Accepted

## Context

We discussed multiple serialisation formats for storing and sharing religion data, including RDF triples, JSON‑LD, YAML and plain JSON.  RDF/JSON‑LD provides strong semantics and interoperability with linked data but requires complex tooling and adds noise (`@context`, `@id`, `@type`) that is unnecessary for internal use.  YAML is human‑friendly but non‑strict, which can lead to subtle parsing differences across implementations.  Our priority is to support an easy‑to‑understand, stable data format for our religion designer and for future analysis, not to publish linked open data immediately.  The data will live in Git repositories and be consumed by our own tools rather than by generic RDF processors.

## Decision

We chose **plain JSON** as the canonical storage and interchange format for religion data.  Each religion snapshot is represented as a JSON object with top‑level arrays for each collection (`religions`, `textCollections`, `texts`, `entities`, `practices`, `events`, `rules`, `claims`, `media`, `notes`, `relations`).  The meta‑schema (defining entities, fields, types and enums) is itself expressed in JSON (e.g. `version`, `enums`, `entities`).  We treat JSON‑LD and RDF as optional export formats that can be generated from our canonical JSON but are not part of our daily workflow.

## Rationale

JSON is ubiquitous, supported by all modern programming languages, and unambiguous.  It supports arrays and objects naturally and fits well with the hierarchical nature of our data.  Using JSON ensures that AI coding assistants, web tools and command line scripts can parse and manipulate data easily.  Storing the schema as JSON as well provides machine‑readable documentation for code generation and validation.  By adopting plain JSON we avoid the cognitive and technical overhead of RDF/JSON‑LD while leaving open the option to produce linked data later.

## Consequences

### Positive
- Simple and familiar format for developers and tools.
- Easy to validate and schema‑check using JSON Schema or TypeScript types.
- Git‑friendly: diffs are clear and line‑based merges work well.

### Negative
- Lacks built‑in semantics: relationships must be interpreted using our schema rather than via RDF vocabularies.
- Large JSON files can be less readable than YAML for humans, though designers rarely read raw data.

### Mitigation
- Provide conversion scripts to export JSON to JSON‑LD or RDF for users who need linked data.
- Offer code generation and validation tools based on the JSON schema to reduce manual errors.