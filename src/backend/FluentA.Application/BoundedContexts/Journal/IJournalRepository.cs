using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.BoundedContexts.Journal;

public interface IJournalRepository
{
    Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default);
    Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default);
    Task UpdateAsync(JournalEntry entry, CancellationToken cancellationToken = default);
}

public sealed record JournalEntryListItem(
    Guid Id,
    string Title,
    string Preview,
    DateTime? LearningDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);
