# US-CLEAN-004 Schema Cleanup And Baseline

## Goal

Finalize the EF model, remove retired schema state, and create one clean baseline
for the verified local/dev database.

## Acceptance Criteria

1. Legacy model properties/configuration and their tests are removed only with
   behavior proof.
2. The old migration source chain is replaced after the final model is settled.
3. The verified local/dev database can be reset and recreated from one baseline.
4. Schema, FK, index, default, and pending-model checks pass.
5. Cross-feature authenticated smoke passes against the recreated database.
