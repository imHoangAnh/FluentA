using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Events;

public sealed record WordAddedEvent(Guid WordId, Guid PageId, DateTime OccurredAt) : IDomainEvent;

public sealed record WordUpdatedEvent(Guid WordId, Guid PageId, DateTime OccurredAt) : IDomainEvent;

public sealed record WordDeletedEvent(Guid WordId, Guid PageId, DateTime OccurredAt) : IDomainEvent;
