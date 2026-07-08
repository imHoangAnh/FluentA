using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.UnitTests;

public sealed class JournalServiceTests
{
    [Fact]
    public async Task CreateListGetUpdateDelete_UsesOwnedEntriesNewestFirst()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var userId = Guid.NewGuid();

        var first = await service.CreateAsync(userId, new CreateJournalEntryRequest("First", "2026-06-10", "Xin chao"));
        var second = await service.CreateAsync(userId, new CreateJournalEntryRequest("Second", "2026-06-11", "Hello"));
        var listed = await service.ListAsync(userId);
        var fetched = await service.GetAsync(userId, first.Value!.Id);
        var updated = await service.UpdateAsync(userId, first.Value.Id, new UpdateJournalEntryRequest("Updated", "Noi dung moi", "2026-06-12"));
        var deleted = await service.DeleteAsync(userId, second.Value!.Id);
        var afterDelete = await service.ListAsync(userId);

        Assert.True(first.IsSuccess);
        Assert.Equal(["Second", "First"], listed.Value!.Select(entry => entry.Title));
        Assert.Equal("<p>Xin chao</p>", fetched.Value!.Content);
        Assert.Equal("Updated", updated.Value!.Title);
        Assert.Equal("2026-06-12", updated.Value.Date);
        Assert.True(deleted.Value);
        Assert.Single(afterDelete.Value!);
    }

    [Fact]
    public async Task ForeignMissingAndDeletedEntries_ReturnJournalNotFound()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var ownerId = Guid.NewGuid();
        var entry = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Private", "2026-06-10"));

        var foreign = await service.GetAsync(Guid.NewGuid(), entry.Value!.Id);
        await service.DeleteAsync(ownerId, entry.Value.Id);
        var deleted = await service.GetAsync(ownerId, entry.Value.Id);

        Assert.Equal("JOURNAL_NOT_FOUND", ((JournalError)foreign.Error!).Code);
        Assert.Equal("JOURNAL_NOT_FOUND", ((JournalError)deleted.Error!).Code);
    }

    [Fact]
    public async Task CreateAndUpdate_RejectInvalidFields()
    {
        var service = new JournalService(new FakeJournalRepository(), new FakeJournalContentProcessor());
        var userId = Guid.NewGuid();

        var invalidCreate = await service.CreateAsync(userId, new CreateJournalEntryRequest(" ", "June-11"));
        var entry = await service.CreateAsync(userId, new CreateJournalEntryRequest("Valid", "2026-06-11"));
        var invalidUpdate = await service.UpdateAsync(userId, entry.Value!.Id, new UpdateJournalEntryRequest(Content: new string('a', 100_001)));

        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidCreate.Error!).Code);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidUpdate.Error!).Code);
    }

    [Fact]
    public async Task Search_ValidatesQueryAndBuildsTitleHighlightRanges()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var userId = Guid.NewGuid();
        await service.CreateAsync(userId, new CreateJournalEntryRequest(
            "Vietnamese practice",
            "2026-06-10",
            "Body text does not participate in search"));

        var result = await service.SearchAsync(userId, "practice");
        var invalid = await service.SearchAsync(userId, " ");

        Assert.True(result.IsSuccess);
        var match = Assert.Single(result.Value!);
        Assert.Equal("Vietnamese practice", match.Title);
        Assert.Single(match.Highlights);
        Assert.Equal("practice", match.Title.Substring(match.Highlights[0].Start, match.Highlights[0].Length), ignoreCase: true);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalid.Error!).Code);
    }

    [Fact]
    public async Task Calendar_GroupsOwnedActiveDatesAndValidatesMonth()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var first = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("First", "2026-06-12", "One"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Second", "2026-06-12", "Two"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Other month", "2026-07-01", "Three"));
        await service.CreateAsync(foreignId, new CreateJournalEntryRequest("Foreign", "2026-06-12", "Four"));
        var deleted = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Deleted", "2026-06-13", "Five"));
        await service.DeleteAsync(ownerId, deleted.Value!.Id);

        var calendar = await service.CalendarAsync(ownerId, "2026-06");
        var invalid = await service.CalendarAsync(ownerId, "June 2026");

        var day = Assert.Single(calendar.Value!);
        Assert.Equal("2026-06-12", day.Date);
        Assert.Equal(2, day.Count);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalid.Error!).Code);
        Assert.True(first.IsSuccess);
    }

    private sealed class FakeJournalRepository : IJournalRepository
    {
        private readonly List<JournalEntry> _entries = [];

        public Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalEntryListItem>>(_entries
                .Where(entry => entry.UserId == userId && entry.DeletedAt is null)
                .OrderByDescending(entry => entry.CreatedAt)
                .ThenByDescending(entry => entry.Id)
                .Select(entry => new JournalEntryListItem(
                    entry.Id,
                    entry.Title,
                    entry.Date,
                    entry.CreatedAt,
                    entry.UpdatedAt))
                .ToList());
        }

        public Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_entries.FirstOrDefault(entry =>
                entry.Id == journalId && entry.UserId == userId && entry.DeletedAt is null));
        }

        public Task<IReadOnlyList<JournalEntrySearchItem>> SearchAsync(Guid userId, string query, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalEntrySearchItem>>(_entries
                .Where(entry =>
                    entry.UserId == userId &&
                    entry.DeletedAt is null &&
                    entry.Title.Contains(query, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(entry => entry.CreatedAt)
                .ThenByDescending(entry => entry.Id)
                .Take(50)
                .Select(entry => new JournalEntrySearchItem(
                    entry.Id,
                    entry.Title,
                    entry.Date,
                    entry.CreatedAt,
                    entry.UpdatedAt))
                .ToList());
        }

        public Task<IReadOnlyList<JournalCalendarDayItem>> CalendarAsync(
            Guid userId,
            DateTime monthStart,
            DateTime monthEnd,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalCalendarDayItem>>(_entries
                .Where(entry =>
                    entry.UserId == userId &&
                    entry.DeletedAt is null &&
                    entry.Date >= monthStart &&
                    entry.Date < monthEnd)
                .GroupBy(entry => entry.Date)
                .OrderBy(group => group.Key)
                .Select(group => new JournalCalendarDayItem(group.Key, group.Count()))
                .ToList());
        }

        public Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default)
        {
            _entries.Add(entry);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(JournalEntry entry, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class FakeJournalContentProcessor : IJournalContentProcessor
    {
        public JournalProcessedContent Process(string? content)
        {
            var plainText = content ?? string.Empty;
            return new JournalProcessedContent(string.IsNullOrEmpty(plainText) ? string.Empty : $"<p>{plainText}</p>", plainText);
        }
    }
}
