# Exec Plan

## Goal

Finish the backend bounded-context split by moving Vocabulary learning
sync/cleanup work behind Flashcard-owned and Review-owned ports.

## Scope

In scope:

- add Flashcard and Review application ports for Vocabulary side effects
- refactor `VocabularyService` to orchestrate synchronous save-time ownership
- remove Flashcard/Review coupling from `IVocabularyRepository` and
  `EfVocabularyRepository`
- add infrastructure port implementations and DI wiring
- update focused Vocabulary unit tests and story evidence

Out of scope:

- controller or frontend route changes
- release-wide browser regression proof
- service extraction or outbox infrastructure

## Risk Classification

Risk flags:

- data ownership and deletion behavior
- existing behavior preservation for vocabulary create/update/delete
- multi-domain orchestration inside one transaction
- weak existing proof around sync/cleanup ownership

Lane: high-risk.

## Work Phases

1. add context-owned ports and null adapters
2. shrink Vocabulary repository contract to Vocabulary-only persistence
3. move sync/cleanup orchestration into `VocabularyService`
4. implement Flashcard and Review infrastructure adapters
5. update unit coverage around page deck creation, card sync, and review
   cleanup dispatch
6. run focused backend proof and record remaining integration gaps honestly
