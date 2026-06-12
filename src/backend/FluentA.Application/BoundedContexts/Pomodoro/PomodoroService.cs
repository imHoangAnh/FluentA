using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using FluentA.Application.Common;
using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Domain.BoundedContexts.Pomodoro.Entities;

namespace FluentA.Application.BoundedContexts.Pomodoro;

public sealed class PomodoroService : IPomodoroService
{
    private readonly IPomodoroRepository _repository;
    private readonly IPomodoroCurrentStateStore _currentStateStore;
    private readonly IPomodoroSyncNotifier _syncNotifier;
    private readonly ITodoRepository? _todoRepository;
    private readonly IKanbanRepository? _kanbanRepository;

    public PomodoroService(
        IPomodoroRepository repository,
        IPomodoroCurrentStateStore currentStateStore,
        IPomodoroSyncNotifier? syncNotifier = null,
        ITodoRepository? todoRepository = null,
        IKanbanRepository? kanbanRepository = null)
    {
        _repository = repository;
        _currentStateStore = currentStateStore;
        _syncNotifier = syncNotifier ?? NullPomodoroSyncNotifier.Instance;
        _todoRepository = todoRepository;
        _kanbanRepository = kanbanRepository;
    }

    public async Task<OperationResult<PomodoroConfigDto>> GetConfigAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var config = await GetOrCreateConfigAsync(userId, cancellationToken);
        return OperationResult<PomodoroConfigDto>.Success(ToConfigDto(config));
    }

    public async Task<OperationResult<PomodoroConfigDto>> UpdateConfigAsync(
        Guid userId,
        UpdatePomodoroConfigRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = ValidateConfigRequest(request);
        if (errors.Count > 0)
        {
            return OperationResult<PomodoroConfigDto>.Failure(PomodoroError.Validation(errors));
        }

        var config = await GetOrCreateConfigAsync(userId, cancellationToken);
        config.Update(request.WorkMinutes, request.ShortBreakMinutes, request.LongBreakMinutes, request.LongBreakAfter);
        await _repository.UpdateConfigAsync(config, cancellationToken);
        return OperationResult<PomodoroConfigDto>.Success(ToConfigDto(config));
    }

    public async Task<OperationResult<PomodoroCurrentStateDto>> GetCurrentAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var config = await GetOrCreateConfigAsync(userId, cancellationToken);
        var snapshot = await _currentStateStore.GetAsync(userId, cancellationToken);
        return OperationResult<PomodoroCurrentStateDto>.Success(ToCurrentDto(Normalize(snapshot ?? IdleSnapshot(config))));
    }

    public async Task<OperationResult<PomodoroCurrentStateDto>> StartAsync(Guid userId, StartPomodoroRequest request, CancellationToken cancellationToken = default)
    {
        var config = await GetOrCreateConfigAsync(userId, cancellationToken);
        var existing = await _currentStateStore.GetAsync(userId, cancellationToken);
        if (existing is not null && !string.Equals(existing.State, PomodoroState.Idle.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return OperationResult<PomodoroCurrentStateDto>.Failure(PomodoroError.InvalidState("Only an idle Pomodoro can be started."));
        }

        var linkError = await ValidateLinkedTaskAsync(userId, request, cancellationToken);
        if (linkError is not null)
        {
            return OperationResult<PomodoroCurrentStateDto>.Failure(linkError);
        }

        return await PersistAndNotifyAsync(
            userId,
            RunningSnapshot(PomodoroPhase.Work, config.WorkMinutes * 60, request.LinkedTaskId, NormalizeSource(request.LinkedTaskSource)),
            cancellationToken);
    }

    public async Task<OperationResult<PomodoroCurrentStateDto>> PauseAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var snapshot = await _currentStateStore.GetAsync(userId, cancellationToken);
        if (snapshot is null || !string.Equals(snapshot.State, PomodoroState.Running.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return OperationResult<PomodoroCurrentStateDto>.Failure(PomodoroError.InvalidState("Only a running Pomodoro can be paused."));
        }

        var normalized = Normalize(snapshot);
        var paused = normalized with { State = PomodoroState.Paused.ToString(), StartedAt = null, PausedAt = DateTime.UtcNow };
        return await PersistAndNotifyAsync(userId, paused, cancellationToken);
    }

    public async Task<OperationResult<PomodoroCurrentStateDto>> ResumeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var snapshot = await _currentStateStore.GetAsync(userId, cancellationToken);
        if (snapshot is null || !string.Equals(snapshot.State, PomodoroState.Paused.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return OperationResult<PomodoroCurrentStateDto>.Failure(PomodoroError.InvalidState("Only a paused Pomodoro can be resumed."));
        }

        var running = snapshot with { State = PomodoroState.Running.ToString(), StartedAt = DateTime.UtcNow, PausedAt = null };
        return await PersistAndNotifyAsync(userId, running, cancellationToken);
    }

    public async Task<OperationResult<PomodoroCurrentStateDto>> ResetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await _currentStateStore.DeleteAsync(userId, cancellationToken);
        var config = await GetOrCreateConfigAsync(userId, cancellationToken);
        var idle = ToCurrentDto(IdleSnapshot(config));
        await _syncNotifier.StateChangedAsync(userId, idle, cancellationToken);
        return OperationResult<PomodoroCurrentStateDto>.Success(idle);
    }

    public async Task<OperationResult<PomodoroCurrentStateDto>> CompleteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var snapshot = await _currentStateStore.GetAsync(userId, cancellationToken);
        if (snapshot is null
            || string.Equals(snapshot.State, PomodoroState.Idle.ToString(), StringComparison.OrdinalIgnoreCase)
            || string.Equals(snapshot.State, PomodoroState.Completed.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return OperationResult<PomodoroCurrentStateDto>.Failure(PomodoroError.InvalidState("Only an active Pomodoro can be completed."));
        }

        var config = await GetOrCreateConfigAsync(userId, cancellationToken);
        PomodoroCurrentStateSnapshot next;
        if (string.Equals(snapshot.Phase, PomodoroPhase.Work.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            var completedAt = DateTime.UtcNow;
            await _repository.AddSessionAsync(PomodoroSession.CompleteWork(
                userId, completedAt, snapshot.DurationSeconds, snapshot.LinkedTaskId, snapshot.LinkedTaskSource), cancellationToken);
            var completedCount = await _repository.CountCompletedWorkSessionsAsync(userId, cancellationToken: cancellationToken);
            next = completedCount % config.LongBreakAfter == 0
                ? RunningSnapshot(PomodoroPhase.LongBreak, config.LongBreakMinutes * 60, snapshot.LinkedTaskId, snapshot.LinkedTaskSource)
                : RunningSnapshot(PomodoroPhase.ShortBreak, config.ShortBreakMinutes * 60, snapshot.LinkedTaskId, snapshot.LinkedTaskSource);
        }
        else
        {
            next = RunningSnapshot(PomodoroPhase.Work, config.WorkMinutes * 60, snapshot.LinkedTaskId, snapshot.LinkedTaskSource);
        }

        return await PersistAndNotifyAsync(userId, next, cancellationToken);
    }

    public async Task<OperationResult<PomodoroTodayDto>> GetTodayAsync(
        Guid userId,
        int utcOffsetMinutes,
        CancellationToken cancellationToken = default)
    {
        if (utcOffsetMinutes is < -840 or > 840)
        {
            return OperationResult<PomodoroTodayDto>.Failure(PomodoroError.Validation(
                new Dictionary<string, string[]> { ["utcOffsetMinutes"] = ["utcOffsetMinutes must be between -840 and 840."] }));
        }

        var offset = TimeSpan.FromMinutes(utcOffsetMinutes);
        var localDate = DateTime.UtcNow.Add(offset).Date;
        var fromUtc = DateTime.SpecifyKind(localDate.Subtract(offset), DateTimeKind.Utc);
        var toUtc = fromUtc.AddDays(1);
        var count = await _repository.CountCompletedWorkSessionsAsync(userId, fromUtc, toUtc, cancellationToken);
        return OperationResult<PomodoroTodayDto>.Success(new PomodoroTodayDto(count));
    }

    private async Task<PomodoroConfig> GetOrCreateConfigAsync(Guid userId, CancellationToken cancellationToken)
    {
        var existing = await _repository.GetConfigAsync(userId, cancellationToken);
        if (existing is not null)
        {
            return existing;
        }

        var config = PomodoroConfig.CreateDefault(userId);
        return await _repository.AddConfigAsync(config, cancellationToken);
    }

    private static Dictionary<string, string[]> ValidateConfigRequest(UpdatePomodoroConfigRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        ValidateRange(errors, nameof(request.WorkMinutes), "workMinutes", request.WorkMinutes, 1, 60);
        ValidateRange(errors, nameof(request.ShortBreakMinutes), "shortBreakMinutes", request.ShortBreakMinutes, 1, 60);
        ValidateRange(errors, nameof(request.LongBreakMinutes), "longBreakMinutes", request.LongBreakMinutes, 1, 60);
        ValidateRange(errors, nameof(request.LongBreakAfter), "longBreakAfter", request.LongBreakAfter, 1, 12);
        return errors;
    }

    private static void ValidateRange(Dictionary<string, string[]> errors, string paramName, string field, int? value, int min, int max)
    {
        if (value is not null && (value.Value < min || value.Value > max))
        {
            errors[field] = [$"{paramName} must be between {min} and {max}."];
        }
    }

    private static PomodoroCurrentStateSnapshot IdleSnapshot(PomodoroConfig config)
    {
        var durationSeconds = config.WorkMinutes * 60;
        return new PomodoroCurrentStateSnapshot(
            PomodoroState.Idle.ToString(),
            PomodoroPhase.Work.ToString(),
            durationSeconds,
            durationSeconds);
    }

    private static PomodoroCurrentStateSnapshot RunningSnapshot(PomodoroPhase phase, int durationSeconds, Guid? linkedTaskId = null, string? linkedTaskSource = null)
    {
        return new PomodoroCurrentStateSnapshot(
            PomodoroState.Running.ToString(),
            phase.ToString(),
            durationSeconds,
            durationSeconds,
            DateTime.UtcNow,
            LinkedTaskId: linkedTaskId,
            LinkedTaskSource: linkedTaskSource);
    }

    private async Task<PomodoroError?> ValidateLinkedTaskAsync(Guid userId, StartPomodoroRequest request, CancellationToken cancellationToken)
    {
        if (request.LinkedTaskId is null && string.IsNullOrWhiteSpace(request.LinkedTaskSource)) return null;
        if (request.LinkedTaskId is null) return PomodoroError.LinkedTaskNotFound();
        var source = NormalizeSource(request.LinkedTaskSource);
        var exists = source switch
        {
            "todo" when _todoRepository is not null => await _todoRepository.GetAsync(userId, request.LinkedTaskId.Value, cancellationToken) is not null,
            "kanban" when _kanbanRepository is not null => await _kanbanRepository.GetCardAsync(userId, request.LinkedTaskId.Value, cancellationToken) is not null,
            _ => false,
        };
        return exists ? null : PomodoroError.LinkedTaskNotFound();
    }

    private static string? NormalizeSource(string? source) => source?.Trim().ToLowerInvariant();

    private async Task<OperationResult<PomodoroCurrentStateDto>> PersistAndNotifyAsync(
        Guid userId,
        PomodoroCurrentStateSnapshot snapshot,
        CancellationToken cancellationToken)
    {
        await _currentStateStore.SetAsync(userId, snapshot, cancellationToken);
        var dto = ToCurrentDto(Normalize(snapshot));
        await _syncNotifier.StateChangedAsync(userId, dto, cancellationToken);
        return OperationResult<PomodoroCurrentStateDto>.Success(dto);
    }

    private static PomodoroCurrentStateSnapshot Normalize(PomodoroCurrentStateSnapshot snapshot)
    {
        if (!string.Equals(snapshot.State, PomodoroState.Running.ToString(), StringComparison.OrdinalIgnoreCase)
            || snapshot.StartedAt is null)
        {
            return snapshot;
        }

        var elapsed = Math.Max(0, (int)Math.Floor((DateTime.UtcNow - snapshot.StartedAt.Value).TotalSeconds));
        return snapshot with { RemainingSeconds = Math.Max(0, snapshot.RemainingSeconds - elapsed) };
    }

    private static PomodoroConfigDto ToConfigDto(PomodoroConfig config)
    {
        return new PomodoroConfigDto(
            config.Id,
            config.WorkMinutes,
            config.ShortBreakMinutes,
            config.LongBreakMinutes,
            config.LongBreakAfter,
            config.CreatedAt,
            config.UpdatedAt);
    }

    private static PomodoroCurrentStateDto ToCurrentDto(PomodoroCurrentStateSnapshot snapshot)
    {
        return new PomodoroCurrentStateDto(
            snapshot.State,
            snapshot.Phase,
            snapshot.RemainingSeconds,
            snapshot.DurationSeconds,
            snapshot.StartedAt,
            snapshot.PausedAt,
            snapshot.LinkedTaskId,
            snapshot.LinkedTaskSource);
    }
}
