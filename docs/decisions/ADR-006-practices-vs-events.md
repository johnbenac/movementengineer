# ADR-006: Separate Practice and Event for Action vs Time

## Status
Accepted

## Context

Movements involve both **what** people do (rituals, prayers, acts of service, learning) and **when** they do them (daily, weekly, annual festivals, life‑cycle events).  We debated whether to fold these dimensions together into a single entity—e.g. a “Ritual” record with frequency attributes—or to handle timing entirely outside the schema.  However, we noticed that many practices occur in multiple contexts (a sacrament celebrated at a weekly service and on special feasts) and that events often involve multiple practices (an Easter vigil includes readings, sacraments and hymns).  Our design needed to express these many‑to‑many relationships clearly while keeping scheduling flexible.

## Decision

We defined two separate entities: `Practice` to represent an action, and `Event` to represent a scheduled occurrence.  `Practice` records the name, type (ritual, discipline, service, study), description, typical frequency, visibility (public/private), and links to involved entities, instruction texts and supporting claims.  `Event` records a name, description, recurrence type (once/daily/weekly/monthly/yearly/other), a timing rule, and lists of participating practices, central entities, readings and supporting claims.  Timing details live on `Event`; `Practice` indicates typical frequency but is not scheduled by itself.  Practices can be reused across many events, and events can include many practices.

## Rationale

By decoupling actions from time slots we avoid duplicating practice definitions for each holiday.  A sacrament is defined once and referred to by numerous feast days.  Conversely, a feast day can easily be updated to add or remove a practice without altering the practice itself.  A separate `Event` entity allows rich recurrence rules and can capture life‑cycle events (baptisms, ordinations) as well as calendar festivals.  This separation simplifies the calendar UI and emphasises that rituals and disciplines have identities distinct from their scheduled occurrence.

## Consequences

### Positive
- Simplifies linking: practices reference texts and entities; events organise practices into time slots.
- Allows re‑use of practices across multiple events and vice versa.
- Clearer UI separation: one screen for action definition, another for calendar planning.

### Negative
- Authors must maintain two tables and link objects appropriately; there’s a risk of practices without events and vice versa.
- Complex, interleaved ceremonies might require an additional sequencing model beyond a simple list of practices.

### Mitigation
- Provide validation to warn when a practice is never scheduled or an event has no practices.
- For multi‑step ceremonies, encourage use of tags or `Relation` edges to indicate ordering or dependencies.