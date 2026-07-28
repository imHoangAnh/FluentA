using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.UnitTests;

public sealed class TrashServiceTests
{
    [Fact]
    public async Task TrashAndRestoreTodo_MovesSelectedAndFutureOccurrences_LeavesPastAndDoesNotRestoreReminders()
    {
        var ownerId = Guid.NewGuid();
        var past = TodoItem.Create(ownerId, "Daily", new DateTime(2035, 7, 20), null, repeatPattern: TodoRepeatPattern.Daily);
        var selected = TodoItem.CreateGeneratedOccurrence(past, new DateTime(2035, 7, 21), 0);
        selected.SetReminder(new TimeOnly(9, 30), "UTC", new DateTime(2035, 7, 21, 9, 30, 0, DateTimeKind.Utc));
        var future = TodoItem.CreateGeneratedOccurrence(selected, new DateTime(2035, 7, 22), 0);
        future.SetReminder(new TimeOnly(9, 30), "UTC", new DateTime(2035, 7, 22, 9, 30, 0, DateTimeKind.Utc));
        var todos = new FakeTodoRepository(past, selected, future);
        var trash = new FakeTrashRepository();
        var service = new TrashService([new TodoTrashParticipant(todos)], trash, new InlineTrashTransaction());

        var moved = await service.TrashTodoAsync(ownerId, selected.Id);

        Assert.True(moved.IsSuccess);
        Assert.Null(past.DeletedAt);
        Assert.NotNull(selected.DeletedAt);
        Assert.Equal(selected.DeletedAt, future.DeletedAt);
        Assert.Null(selected.ReminderScheduledAtUtc);
        Assert.Null(future.ReminderScheduledAtUtc);
        var entry = Assert.Single(trash.Entries);
        Assert.Equal(selected.Id, entry.EntityId);

        var restored = await service.RestoreAsync(ownerId, entry.Id);

        Assert.True(restored.IsSuccess);
        Assert.Null(selected.DeletedAt);
        Assert.Null(future.DeletedAt);
        Assert.Null(selected.ReminderScheduledAtUtc);
        Assert.Null(future.ReminderScheduledAtUtc);
        Assert.Empty(trash.Entries);
    }

    [Fact]
    public async Task RestoreAndPermanentDelete_DoNotDiscloseOrMutateForeignTrash()
    {
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var item = TodoItem.Create(ownerId, "Private", new DateTime(2035, 7, 21), null);
        var todos = new FakeTodoRepository(item);
        var trash = new FakeTrashRepository();
        var service = new TrashService([new TodoTrashParticipant(todos)], trash, new InlineTrashTransaction());
        var moved = await service.TrashTodoAsync(ownerId, item.Id);
        var entry = Assert.Single(trash.Entries);

        var restore = await service.RestoreAsync(foreignId, entry.Id);
        var delete = await service.PermanentlyDeleteAsync(foreignId, entry.Id);

        Assert.False(restore.IsSuccess);
        Assert.False(delete.IsSuccess);
        Assert.NotNull(item.DeletedAt);
        Assert.Single(trash.Entries);
        Assert.Equal(TrashEntryState.Active, entry.State);
        Assert.True(moved.IsSuccess);
    }

    [Fact]
    public async Task LevelFiveTrash_RestoreStartsAtLevelZeroTomorrow_AndPermanentDeleteKeepsSourceWord()
    {
        var userId = Guid.NewGuid();
        var wordId = Guid.NewGuid();
        var state = WordReviewState.CreateLevelZero(userId, wordId, new DateOnly(2026, 7, 1));
        state.ApplyResult(5, new DateOnly(2026, 7, 29), lapseCountAfter: 2, reviewedOn: new DateOnly(2026, 7, 28));
        var review = new FakeLevelFiveTrashRepository(state, "resilient", "English / Unit 1");
        var participant = new LevelFiveTrashParticipant(review);
        var movedAt = new DateTime(2026, 7, 28, 18, 0, 0, DateTimeKind.Utc);

        var moved = await participant.MoveToTrashAsync(userId, wordId, movedAt, TimeSpan.FromDays(30));

        Assert.True(moved.IsSuccess);
        Assert.Equal(WordReviewStatus.Inactive, state.Status);
        Assert.Equal(5, state.Level);
        var restored = await participant.RestoreAsync(
            moved.Value!,
            movedAt,
            TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));

        Assert.True(restored);
        Assert.True(review.SourceWordStillExists);
        Assert.Equal(WordReviewStatus.Active, state.Status);
        Assert.Equal(0, state.Level);
        Assert.Equal(new DateOnly(2026, 7, 30), state.NextReviewDate);
        Assert.Equal(2, state.LapseCount);
        Assert.Null(state.LastReviewedAt);

        state.ApplyResult(5, new DateOnly(2026, 8, 1), lapseCountAfter: 2, reviewedOn: new DateOnly(2026, 7, 31));
        var trashedAgain = await participant.MoveToTrashAsync(userId, wordId, movedAt, TimeSpan.FromDays(30));
        var deleted = await participant.PermanentlyDeleteAsync(trashedAgain.Value!, movedAt);

        Assert.True(deleted);
        Assert.True(review.SourceWordStillExists);
        Assert.Null(review.State);
        Assert.True(review.ProgressDeleted);
    }

    private sealed class InlineTrashTransaction : ITrashTransaction
    {
        public Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken = default) => action(cancellationToken);
    }

    private sealed class FakeTrashRepository : ITrashRepository
    {
        public List<TrashEntry> Entries { get; } = [];

        public Task AddAsync(TrashEntry entry, CancellationToken cancellationToken = default)
        {
            Entries.Add(entry);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<TrashEntry>> ListActiveAsync(Guid userId, TrashEntityKind? kind, string? search, int limit, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TrashEntry>>(Entries.Where(entry => entry.UserId == userId && entry.State == TrashEntryState.Active && (kind is null || entry.EntityKind == kind)).ToList());
        }

        public Task<TrashEntry?> ClaimOwnedAsync(Guid userId, Guid entryId, TrashEntryState claimState, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var entry = Entries.SingleOrDefault(candidate => candidate.Id == entryId && candidate.UserId == userId && candidate.State == TrashEntryState.Active);
            if (entry is not null) entry.MarkClaimed(claimState, nowUtc);
            return Task.FromResult(entry);
        }

        public Task<TrashEntry?> ClaimDueAsync(Guid entryId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var entry = Entries.SingleOrDefault(candidate => candidate.Id == entryId && candidate.State == TrashEntryState.Active && candidate.PurgeAfterAt <= nowUtc);
            if (entry is not null) entry.MarkClaimed(TrashEntryState.Purging, nowUtc);
            return Task.FromResult(entry);
        }

        public Task<IReadOnlyList<Guid>> ListDueEntryIdsAsync(DateTime nowUtc, int limit, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Guid>>(Entries.Where(entry => entry.State == TrashEntryState.Active && entry.PurgeAfterAt <= nowUtc).Take(limit).Select(entry => entry.Id).ToList());

        public Task UpdateAsync(TrashEntry entry, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task RemoveAsync(TrashEntry entry, CancellationToken cancellationToken = default)
        {
            Entries.Remove(entry);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeLevelFiveTrashRepository : ILevelFiveTrashRepository
    {
        private readonly string _word;
        private readonly string _location;

        public FakeLevelFiveTrashRepository(WordReviewState state, string word, string location)
        {
            State = state;
            _word = word;
            _location = location;
        }

        public WordReviewState? State { get; private set; }
        public bool SourceWordStillExists { get; } = true;
        public bool ProgressDeleted { get; private set; }

        public Task<LevelFiveTrashSource?> GetActiveAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default) =>
            Task.FromResult(State is { Status: WordReviewStatus.Active, Level: 5 } state && state.UserId == userId && state.WordId == wordId
                ? new LevelFiveTrashSource(state, _word, _location)
                : null);

        public Task<WordReviewState?> GetTrashedAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default) =>
            Task.FromResult(State is { Status: WordReviewStatus.Inactive, Level: 5 } state && state.UserId == userId && state.WordId == wordId
                ? state
                : null);

        public Task DeleteProgressAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
        {
            if (State is { } state && state.UserId == userId && state.WordId == wordId)
            {
                State = null;
                ProgressDeleted = true;
            }

            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakeTodoRepository(params TodoItem[] initial) : ITodoRepository
    {
        private readonly List<TodoItem> _items = [.. initial];

        public Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<TodoItem>>(_items.Where(item => item.UserId == userId && item.Date == date && item.DeletedAt is null).ToList());
        public Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<TodoItem>>(_items.Where(item => item.UserId == userId && item.Date >= startDate && item.Date <= endDate && item.DeletedAt is null).ToList());
        public Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default) => Task.FromResult(_items.SingleOrDefault(item => item.UserId == userId && item.Id == todoId && item.DeletedAt is null));
        public Task<TodoItem?> GetActiveForTrashAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default) => GetAsync(userId, todoId, cancellationToken);
        public Task<IReadOnlyList<TodoItem>> ListOwnedIncludingDeletedAsync(Guid userId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<TodoItem>>(_items.Where(item => item.UserId == userId).ToList());
        public Task<int> NextSortOrderAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default) => Task.FromResult(0);
        public Task AddAsync(TodoItem item, CancellationToken cancellationToken = default) { _items.Add(item); return Task.CompletedTask; }
        public Task UpdateAsync(TodoItem item, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateRangeAsync(IReadOnlyList<TodoItem> items, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task RemoveRangeAsync(IReadOnlyList<TodoItem> items, CancellationToken cancellationToken = default) { _items.RemoveAll(item => items.Contains(item)); return Task.CompletedTask; }
        public Task<TodoCompletionMutationResult?> SetCompletionAsync(Guid userId, Guid todoId, bool isCompleted, DateTime nowUtc, CancellationToken cancellationToken = default) => Task.FromResult<TodoCompletionMutationResult?>(null);
    }
}
