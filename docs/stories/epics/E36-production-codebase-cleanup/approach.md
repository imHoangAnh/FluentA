# E36 Production Codebase Cleanup Approach

## Dependency Order

`US-CLEAN-001` establishes the inventory and proof gates. Frontend and backend
cleanup (`US-CLEAN-002` and `US-CLEAN-003`) can be reviewed independently, but
the final model cleanup and baseline (`US-CLEAN-004`) follows them. Contract test
repair (`US-CLEAN-005`) follows route/schema decisions. The dependency/config
sweep and release proof (`US-CLEAN-006`) is the final handoff gate to E34.

## Deletion Rule

For every deletion, prove both (1) no direct reference/caller and (2) no
indirect use through routing, DI, serialization, reflection, jobs, or config.
Run focused proof immediately after the deletion and preserve the evidence in the
story validation file.

## Baseline Rule

Do not scaffold the new EF baseline until the final entity model, mappings,
indexes, defaults, and legacy columns are settled. Apply it only to the verified
local/dev database, inspect the resulting schema, and run the pending-model check.

## Rejected Scope

- Deployment, hosting, CI/CD, domain, and cloud changes.
- Broad dependency upgrades.
- Rewriting historical E33/E34 artifacts.
- Removing supported product behavior for the sake of a smaller codebase.
