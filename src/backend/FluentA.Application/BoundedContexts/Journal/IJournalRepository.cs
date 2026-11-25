using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.BoundedContexts.Journal;

public interface IJournalRepository
{
    Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JournalEntrySearchItem>> SearchAsync(Guid userId, string query, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JournalCalendarDayItem>> CalendarAsync(Guid userId, DateTime monthStart, DateTime monthEnd, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<JournalVocabSuggestionItem>> ListVocabSuggestionsAsync(Guid userId, int count, CancellationToken cancellationToken = default);
    Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default);
    Task<bool> DateExistsAsync(Guid userId, DateTime date, Guid? excludingId = null, CancellationToken cancellationToken = default);
    Task<IReadOnlySet<Guid>> GetEntryAssetIdsAsync(Guid entryId, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, Guid>> GetAttachedAssetEntryIdsAsync(IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default);
    Task ReplaceEntryAssetLinksAsync(Guid entryId, IReadOnlySet<Guid> assetIds, CancellationToken cancellationToken = default);
    Task<bool> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default);
    Task UpdateAsync(JournalEntry entry, CancellationToken cancellationToken = default);
}

public sealed record JournalEntryListItem(
    Guid Id,
    string Title,
    DateTime Date,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? Mood = null,
    bool IsStarred = false,
    IReadOnlyList<string>? Tags = null,
    string ContentSnippet = "");

public sealed record JournalEntrySearchItem(
    Guid Id,
    string Title,
    DateTime Date,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? Mood = null,
    bool IsStarred = false,
    IReadOnlyList<string>? Tags = null,
    string ContentSnippet = "");

public sealed record JournalCalendarDayItem(DateTime Date, int Count, string? Mood = null);

public sealed record JournalVocabSuggestionItem(Guid Id, string Word, string Meaning, string Type);
