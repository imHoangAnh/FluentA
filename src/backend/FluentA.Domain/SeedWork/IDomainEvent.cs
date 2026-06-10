namespace FluentA.Domain.SeedWork;

public interface IDomainEvent
{
    DateTime OccurredAt { get; }
}
