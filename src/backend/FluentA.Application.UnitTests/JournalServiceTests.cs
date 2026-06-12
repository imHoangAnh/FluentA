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

        var first = await service.CreateAsync(userId, new CreateJournalEntryRequest("First", "Xin chào", "2026-06-10"));
        var second = await service.CreateAsync(userId, new CreateJournalEntryRequest("Second", "Hello", null));
        var listed = await service.ListAsync(userId);
        var fetched = await service.GetAsync(userId, first.Value!.Id);
        var updated = await service.UpdateAsync(userId, first.Value.Id, new UpdateJournalEntryRequest("Updated", "Nội dung mới", ""));
        var deleted = await service.DeleteAsync(userId, second.Value!.Id);
        var afterDelete = await service.ListAsync(userId);

        Assert.True(first.IsSuccess);
        Assert.Equal(["Second", "First"], listed.Value!.Select(entry => entry.Title));
        Assert.Equal("<p>Xin chào</p>", fetched.Value!.Content);
        Assert.Equal("Updated", updated.Value!.Title);
        Assert.Null(updated.Value.LearningDate);
        Assert.True(deleted.Value);
        Assert.Single(afterDelete.Value!);
    }

    [Fact]
    public async Task ForeignMissingAndDeletedEntries_ReturnJournalNotFound()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var ownerId = Guid.NewGuid();
        var entry = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Private"));

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

        var invalidCreate = await service.CreateAsync(userId, new CreateJournalEntryRequest(" ", LearningDate: "June 11"));
        var entry = await service.CreateAsync(userId, new CreateJournalEntryRequest("Valid"));
        var invalidUpdate = await service.UpdateAsync(userId, entry.Value!.Id, new UpdateJournalEntryRequest(Content: new string('a', 100_001)));

        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidCreate.Error!).Code);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidUpdate.Error!).Code);
    }

    [Fact]
    public async Task Search_ValidatesQueryAndBuildsContextualHighlightRanges()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var userId = Guid.NewGuid();
        await service.CreateAsync(userId, new CreateJournalEntryRequest(
            "Vietnamese practice",
            $"Beginning {new string('x', 80)} Xin chào thế giới and xin chào again."));

        var result = await service.SearchAsync(userId, "xin chào");
        var invalid = await service.SearchAsync(userId, " ");

        Assert.True(result.IsSuccess);
        var match = Assert.Single(result.Value!);
        Assert.Equal("Vietnamese practice", match.Title);
        Assert.Contains("Xin chào", match.Preview, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(match.Highlights);
        Assert.All(match.Highlights, range =>
            Assert.Equal("xin chào", match.Preview.Substring(range.Start, range.Length), ignoreCase: true));
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalid.Error!).Code);
    }

    [Fact]
    public async Task Calendar_GroupsOwnedActiveLearningDatesAndValidatesMonth()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor());
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var first = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("First", "One", "2026-06-12"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Second", "Two", "2026-06-12"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Other month", "Three", "2026-07-01"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("No date", "Four"));
        await service.CreateAsync(foreignId, new CreateJournalEntryRequest("Foreign", "Five", "2026-06-12"));
        var deleted = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Deleted", "Six", "2026-06-13"));
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
                    entry.Preview,
                    entry.LearningDate,
                    entry.CreatedAt,
                    entry.UpdatedAt))
                .ToList());
        }

        public Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_entries.FirstOrDefault(entry =>
                entry.Id == journalId && entry.UserId == userId && entry.DeletedAt is null));
        }

        public Task<IReadOnlyList<JournalEntrySearchItem>> SearchAsync(
            Guid userId,
            string query,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalEntrySearchItem>>(_entries
                .Where(entry =>
                    entry.UserId == userId &&
                    entry.DeletedAt is null &&
                    entry.PlainTextContent.Contains(query, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(entry => entry.CreatedAt)
                .ThenByDescending(entry => entry.Id)
                .Take(50)
                .Select(entry => new JournalEntrySearchItem(
                    entry.Id,
                    entry.Title,
                    entry.PlainTextContent,
                    entry.LearningDate,
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
                    entry.LearningDate is not null &&
                    entry.LearningDate >= monthStart &&
                    entry.LearningDate < monthEnd)
                .GroupBy(entry => entry.LearningDate!.Value)
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
