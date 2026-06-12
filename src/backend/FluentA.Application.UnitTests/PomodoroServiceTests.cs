using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using FluentA.Domain.BoundedContexts.Pomodoro.Entities;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Kanban.Entities;

namespace FluentA.Application.UnitTests;

public sealed class PomodoroServiceTests
{
    [Fact]
    public async Task GetConfigAsync_CreatesDefaultConfigWhenMissing()
    {
        var repository = new FakePomodoroRepository();
        var service = new PomodoroService(repository, new FakeCurrentStateStore());
        var userId = Guid.NewGuid();

        var result = await service.GetConfigAsync(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal(25, result.Value!.WorkMinutes);
        Assert.Equal(5, result.Value.ShortBreakMinutes);
        Assert.Equal(15, result.Value.LongBreakMinutes);
        Assert.Equal(4, result.Value.LongBreakAfter);
        Assert.Single(repository.Configs);
        Assert.Equal(userId, repository.Configs[0].UserId);
    }

    [Fact]
    public async Task GetConfigAsync_ReturnsConfigThatWinsConcurrentCreation()
    {
        var userId = Guid.NewGuid();
        var winningConfig = PomodoroConfig.CreateDefault(userId);
        winningConfig.Update(35, null, null, null);
        var repository = new FakePomodoroRepository { ConcurrentWinner = winningConfig };
        var service = new PomodoroService(repository, new FakeCurrentStateStore());

        var result = await service.GetConfigAsync(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal(35, result.Value!.WorkMinutes);
    }

    [Fact]
    public async Task UpdateConfigAsync_ValidatesAndPersistsSuppliedFields()
    {
        var repository = new FakePomodoroRepository();
        var userId = Guid.NewGuid();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var service = new PomodoroService(repository, new FakeCurrentStateStore());

        var result = await service.UpdateConfigAsync(userId, new UpdatePomodoroConfigRequest(30, LongBreakAfter: 3));

        Assert.True(result.IsSuccess);
        Assert.Equal(30, result.Value!.WorkMinutes);
        Assert.Equal(5, result.Value.ShortBreakMinutes);
        Assert.Equal(15, result.Value.LongBreakMinutes);
        Assert.Equal(3, result.Value.LongBreakAfter);
        Assert.Equal(1, repository.UpdateCount);
    }

    [Fact]
    public async Task UpdateConfigAsync_ReturnsValidationErrorsForOutOfRangeValues()
    {
        var service = new PomodoroService(new FakePomodoroRepository(), new FakeCurrentStateStore());

        var result = await service.UpdateConfigAsync(Guid.NewGuid(), new UpdatePomodoroConfigRequest(0, 61, -1, 13));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<PomodoroError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
        Assert.Equal(422, error.StatusCode);
    }

    [Fact]
    public async Task GetCurrentAsync_ReturnsIdleFallbackFromConfigWhenRedisIsEmpty()
    {
        var repository = new FakePomodoroRepository();
        var userId = Guid.NewGuid();
        var config = PomodoroConfig.CreateDefault(userId);
        config.Update(40, null, null, null);
        repository.Configs.Add(config);
        var service = new PomodoroService(repository, new FakeCurrentStateStore());

        var result = await service.GetCurrentAsync(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal("Idle", result.Value!.State);
        Assert.Equal("Work", result.Value.Phase);
        Assert.Equal(2400, result.Value.DurationSeconds);
        Assert.Equal(2400, result.Value.RemainingSeconds);
    }

    [Fact]
    public async Task GetCurrentAsync_ReturnsStoredCurrentStateWhenPresent()
    {
        var repository = new FakePomodoroRepository();
        var userId = Guid.NewGuid();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var snapshot = new PomodoroCurrentStateSnapshot("Running", "Work", 1200, 1500, DateTime.UtcNow);
        var service = new PomodoroService(repository, new FakeCurrentStateStore(snapshot));

        var result = await service.GetCurrentAsync(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal("Running", result.Value!.State);
        Assert.Equal(1200, result.Value.RemainingSeconds);
        Assert.Equal(1500, result.Value.DurationSeconds);
    }

    [Fact]
    public async Task TimerControls_PersistTransitionsAndNotify()
    {
        var repository = new FakePomodoroRepository();
        var userId = Guid.NewGuid();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var store = new FakeCurrentStateStore();
        var notifier = new RecordingPomodoroSyncNotifier(store);
        var service = new PomodoroService(repository, store, notifier);

        var started = await service.StartAsync(userId, new StartPomodoroRequest());
        var paused = await service.PauseAsync(userId);
        var resumed = await service.ResumeAsync(userId);
        var completed = await service.CompleteAsync(userId);
        var reset = await service.ResetAsync(userId);

        Assert.Equal("Running", started.Value!.State);
        Assert.Equal("Work", started.Value.Phase);
        Assert.Equal("Paused", paused.Value!.State);
        Assert.Equal("Running", resumed.Value!.State);
        Assert.Equal("ShortBreak", completed.Value!.Phase);
        Assert.Equal("Idle", reset.Value!.State);
        Assert.Null(store.Snapshot);
        Assert.Equal(5, notifier.States.Count);
        Assert.All(notifier.StoreWasUpdated, Assert.True);
    }

    [Fact]
    public async Task TimerControls_RejectInvalidTransitionsWithoutNotifying()
    {
        var repository = new FakePomodoroRepository();
        var userId = Guid.NewGuid();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var store = new FakeCurrentStateStore();
        var notifier = new RecordingPomodoroSyncNotifier(store);
        var service = new PomodoroService(repository, store, notifier);

        var pause = await service.PauseAsync(userId);
        var resume = await service.ResumeAsync(userId);
        var complete = await service.CompleteAsync(userId);

        Assert.False(pause.IsSuccess);
        Assert.False(resume.IsSuccess);
        Assert.False(complete.IsSuccess);
        Assert.All(new[] { pause, resume, complete }, result =>
            Assert.Equal("POMODORO_INVALID_STATE", Assert.IsType<PomodoroError>(result.Error).Code));
        Assert.Empty(notifier.States);
    }

    [Fact]
    public async Task GetCurrentAsync_ComputesRemainingTimeForRunningState()
    {
        var repository = new FakePomodoroRepository();
        var userId = Guid.NewGuid();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var snapshot = new PomodoroCurrentStateSnapshot("Running", "Work", 1200, 1500, DateTime.UtcNow.AddSeconds(-10));
        var service = new PomodoroService(repository, new FakeCurrentStateStore(snapshot));

        var result = await service.GetCurrentAsync(userId);

        Assert.InRange(result.Value!.RemainingSeconds, 1189, 1190);
    }

    [Fact]
    public async Task CompleteAsync_PersistsWorkAndSchedulesConfiguredLongBreak()
    {
        var userId = Guid.NewGuid();
        var repository = new FakePomodoroRepository();
        var config = PomodoroConfig.CreateDefault(userId);
        config.Update(null, null, 20, 2);
        repository.Configs.Add(config);
        repository.Sessions.Add(PomodoroSession.CompleteWork(userId, DateTime.UtcNow.AddMinutes(-30), 1500));
        var store = new FakeCurrentStateStore(new PomodoroCurrentStateSnapshot("Running", "Work", 0, 1500, DateTime.UtcNow.AddMinutes(-25)));
        var service = new PomodoroService(repository, store);

        var result = await service.CompleteAsync(userId);

        Assert.True(result.IsSuccess);
        Assert.Equal("LongBreak", result.Value!.Phase);
        Assert.Equal(1200, result.Value.DurationSeconds);
        Assert.Equal(2, repository.Sessions.Count);
    }

    [Fact]
    public async Task CompleteAsync_DoesNotPersistBreakSession()
    {
        var userId = Guid.NewGuid();
        var repository = new FakePomodoroRepository();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var store = new FakeCurrentStateStore(new PomodoroCurrentStateSnapshot("Running", "ShortBreak", 0, 300, DateTime.UtcNow.AddMinutes(-5)));
        var service = new PomodoroService(repository, store);

        var result = await service.CompleteAsync(userId);

        Assert.Equal("Work", result.Value!.Phase);
        Assert.Empty(repository.Sessions);
    }

    [Fact]
    public async Task GetTodayAsync_UsesOwnerAndUtcWindow()
    {
        var userId = Guid.NewGuid();
        var repository = new FakePomodoroRepository();
        repository.Sessions.Add(PomodoroSession.CompleteWork(userId, DateTime.UtcNow, 1500));
        repository.Sessions.Add(PomodoroSession.CompleteWork(Guid.NewGuid(), DateTime.UtcNow, 1500));
        repository.Sessions.Add(PomodoroSession.CompleteWork(userId, DateTime.UtcNow.AddDays(-2), 1500));
        var service = new PomodoroService(repository, new FakeCurrentStateStore());

        var result = await service.GetTodayAsync(userId, 0);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.CompletedWorkSessions);
    }

    [Fact]
    public async Task StartAndComplete_PreservesOwnedTodoLink()
    {
        var userId = Guid.NewGuid();
        var todo = TodoItem.Create(userId, "Linked focus task", DateTime.UtcNow, null);
        var repository = new FakePomodoroRepository();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var store = new FakeCurrentStateStore();
        var service = new PomodoroService(repository, store, todoRepository: new FakeTodoRepository(todo));

        var started = await service.StartAsync(userId, new StartPomodoroRequest(todo.Id, "todo"));
        await service.CompleteAsync(userId);

        Assert.True(started.IsSuccess);
        Assert.Equal(todo.Id, started.Value!.LinkedTaskId);
        Assert.Equal("todo", started.Value.LinkedTaskSource);
        Assert.Equal(todo.Id, repository.Sessions.Single().LinkedTaskId);
        Assert.Equal("todo", repository.Sessions.Single().LinkedTaskSource);
    }

    [Fact]
    public async Task Start_RejectsMissingOrForeignLinkedTask()
    {
        var userId = Guid.NewGuid();
        var repository = new FakePomodoroRepository();
        repository.Configs.Add(PomodoroConfig.CreateDefault(userId));
        var service = new PomodoroService(repository, new FakeCurrentStateStore(), todoRepository: new FakeTodoRepository());

        var result = await service.StartAsync(userId, new StartPomodoroRequest(Guid.NewGuid(), "todo"));

        Assert.False(result.IsSuccess);
        Assert.Equal("POMODORO_LINKED_TASK_NOT_FOUND", Assert.IsType<PomodoroError>(result.Error).Code);
    }

    private sealed class FakeTodoRepository(params TodoItem[] items) : ITodoRepository
    {
        public Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default) =>
            Task.FromResult(items.FirstOrDefault(item => item.Id == todoId && item.UserId == userId && item.DeletedAt is null));
        public Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<TodoItem>>([]);
        public Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<TodoItem>>([]);
        public Task<IReadOnlyList<TodoItem>> ListCarryOverCandidatesAsync(Guid userId, DateTime today, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyList<TodoItem>>([]);
        public Task<int> NextSortOrderAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default) => Task.FromResult(0);
        public Task AddAsync(TodoItem item, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(TodoItem item, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateRangeAsync(IReadOnlyList<TodoItem> values, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class FakePomodoroRepository : IPomodoroRepository
    {
        public List<PomodoroConfig> Configs { get; } = [];
        public List<PomodoroSession> Sessions { get; } = [];
        public int UpdateCount { get; private set; }
        public PomodoroConfig? ConcurrentWinner { get; init; }

        public Task<PomodoroConfig?> GetConfigAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Configs.FirstOrDefault(config => config.UserId == userId && config.DeletedAt is null));
        }

        public Task<PomodoroConfig> AddConfigAsync(PomodoroConfig config, CancellationToken cancellationToken = default)
        {
            if (ConcurrentWinner is not null)
            {
                Configs.Add(ConcurrentWinner);
                return Task.FromResult(ConcurrentWinner);
            }

            Configs.Add(config);
            return Task.FromResult(config);
        }

        public Task UpdateConfigAsync(PomodoroConfig config, CancellationToken cancellationToken = default)
        {
            UpdateCount++;
            return Task.CompletedTask;
        }

        public Task AddSessionAsync(PomodoroSession session, CancellationToken cancellationToken = default)
        {
            Sessions.Add(session);
            return Task.CompletedTask;
        }

        public Task<int> CountCompletedWorkSessionsAsync(
            Guid userId,
            DateTime? fromUtc = null,
            DateTime? toUtc = null,
            CancellationToken cancellationToken = default)
        {
            var count = Sessions.Count(session => session.UserId == userId
                && session.Phase == PomodoroPhase.Work
                && session.State == PomodoroState.Completed
                && (fromUtc is null || session.CompletedAt >= fromUtc)
                && (toUtc is null || session.CompletedAt < toUtc));
            return Task.FromResult(count);
        }
    }

    private sealed class FakeCurrentStateStore : IPomodoroCurrentStateStore
    {
        public PomodoroCurrentStateSnapshot? Snapshot { get; private set; }
        public bool WasDeleted { get; private set; }

        public FakeCurrentStateStore(PomodoroCurrentStateSnapshot? snapshot = null)
        {
            Snapshot = snapshot;
        }

        public Task<PomodoroCurrentStateSnapshot?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Snapshot);
        }

        public Task SetAsync(Guid userId, PomodoroCurrentStateSnapshot snapshot, CancellationToken cancellationToken = default)
        {
            Snapshot = snapshot;
            WasDeleted = false;
            return Task.CompletedTask;
        }

        public Task DeleteAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            Snapshot = null;
            WasDeleted = true;
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingPomodoroSyncNotifier : IPomodoroSyncNotifier
    {
        private readonly FakeCurrentStateStore _store;

        public RecordingPomodoroSyncNotifier(FakeCurrentStateStore store)
        {
            _store = store;
        }

        public List<PomodoroCurrentStateDto> States { get; } = [];
        public List<bool> StoreWasUpdated { get; } = [];

        public Task StateChangedAsync(Guid userId, PomodoroCurrentStateDto state, CancellationToken cancellationToken = default)
        {
            States.Add(state);
            StoreWasUpdated.Add(_store.Snapshot is not null || _store.WasDeleted);
            return Task.CompletedTask;
        }
    }
}

