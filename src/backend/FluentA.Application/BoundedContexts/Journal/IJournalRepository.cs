using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.BoundedContexts.Journal;

public interface IJournalRepository
{
    Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JournalEntrySearchItem>> SearchAsync(Guid userId, string query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JournalCalendarDayItem>> CalendarAsync(Guid userId, DateTime monthStart, DateTime monthEnd, CancellationToken cancellationToken = default);
    Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default);
    Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default);
    Task UpdateAsync(JournalEntry entry, CancellationToken cancellationToken = default);
}

public sealed record JournalEntryListItem(
    Guid Id,
    string Title,
    DateTime Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record JournalEntrySearchItem(
    Guid Id,
    string Title,
    DateTime Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record JournalCalendarDayItem(DateTime Date, int Count);
