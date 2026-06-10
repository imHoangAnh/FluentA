# Design

## Cell Command

Add an owner-scoped cell update command keyed by stable fixed or custom column
key. It loads current durable state and changes only one cell, so overlapping
unrelated-cell requests cannot overwrite one another.

## Client State

Maintain per-cell confirmed value, draft, pending state, and error. Same-cell
saves serialize; successful responses update the query cache in place. Failed
saves retain the draft and expose Retry. Escape restores the confirmed value.

## Keyboard Contract

Native Tab order moves forward/backward through visible editable cells while
triggering save. A persistent blank row below saved rows supports end-row Enter
creation and continued entry.
