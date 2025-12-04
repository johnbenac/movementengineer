# ADR-005: Claims as First‑Class Atomic Statements

## Status
Accepted

## Context

Movement designers needed a way to capture statements about reality, gods, people, afterlife, ethics and cosmology.  We initially considered storing these as annotations on texts or as notes on entities.  However, such an approach would bury doctrinal content inside narrative or descriptive fields, making it difficult to query or attach authority metadata.  We wanted to separate the presentation of text from the extraction of meaning.  Furthermore, movements may hold multiple competing interpretations of a passage, or scholars may want to record summary beliefs that are not identical to any one verse.  A dedicated mechanism was required to capture these “truth claims” in a structured and traceable way.

## Decision

We introduced a `Claim` entity representing an atomic statement believed or asserted within the movement.  Each claim stores the claim text, optional category and tags, and lists of `sourceTextIds` (passages that support or inspire the claim) and `aboutEntityIds` (entities the claim concerns).  Claims also record `sourcesOfTruth` strings and `sourceEntityIds` to document why they are considered authoritative.  Claims are intentionally flat; they are not nested or composed but can be linked indirectly via categories or tags.  Statements that prescribe behaviour are represented as `Rule`s rather than claims.

## Rationale

Extracting beliefs into discrete claim records allows us to decouple doctrine from scripture and narrative.  It becomes possible to list all statements about the afterlife, to see which texts underpin a belief, and to compare claims across traditions.  By attaching authority metadata at the claim level, we can differentiate between competing interpretations of the same passage.  Keeping claims atomic means each record can be individually referenced, superseded or patched in future versions.  Rules are kept separate to avoid conflating descriptive and prescriptive content, yet they can reference claims for justification.

## Consequences

### Positive
- Doctrine and belief are stored in a structured manner, enabling queries and visualisations.
- Multiple claims can point to the same passage, reflecting interpretive diversity.
- Authority provenance is explicit, supporting debate about sources and inspiration.

### Negative
- Authors must decide how granular to make claims; too coarse and nuance is lost, too fine and the data becomes unwieldy.
- Without a hierarchy among claims, complex teachings may require many small claim records linked by categories and tags, which tools must interpret.

### Mitigation
- Provide guidelines on claim granularity (e.g. one claim per assertion rather than per sentence).
- Encourage the use of `category` and `tags` fields to group related claims, enabling simple queries without nesting.