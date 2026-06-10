# Design

## Domain Model

No new durable entity. Notification is a post-commit application concern.

## Application Flow

After a vocabulary repository command commits, `VocabularyService` calls a
synchronization notifier. The SignalR implementation sends
`VocabWordSaved` and `FlashcardDeckUpdated` to the authenticated user's group.

## Interface Contract

- Hub: `/hubs/sync`
- `VocabWordSaved`: `{ wordId, pageId }`
- `FlashcardDeckUpdated`: `{ boardId, deckId }`

## Data Model

No schema change.

## UI / Platform Impact

Provides the authenticated real-time transport used by the later viewer story.

## Observability

Existing request logs prove source commands. Runtime validation records
connection authorization and received events.

## Alternatives Considered

1. Broadcast inside repository synchronization. Rejected because notification
   could precede commit.
2. Broadcast globally. Rejected because it leaks user activity and creates
   unnecessary invalidation.
