# Overview

## Current Behavior

Existing rows use whole-word drafts and explicit Save buttons. The table does
not implement the SPEC blur/Tab autosave, keyboard traversal, Escape
cancellation, end-row Enter creation, or resilient retry contract.

## Target Behavior

Every visible cell saves independently on blur or Tab, preserves failed drafts
with inline Retry, and follows the SPEC keyboard contract without unrelated
cell overwrites.

## Non-Goals

- Language-adaptive labels.
- Offline editing.
- Collaborative conflict resolution across browser sessions.
