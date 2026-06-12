namespace FluentA.Application.BoundedContexts.Pomodoro.DTOs;

public sealed record UpdatePomodoroConfigRequest(
    int? WorkMinutes = null,
    int? ShortBreakMinutes = null,
    int? LongBreakMinutes = null,
    int? LongBreakAfter = null);

public sealed record PomodoroConfigDto(
    Guid Id,
    int WorkMinutes,
    int ShortBreakMinutes,
    int LongBreakMinutes,
    int LongBreakAfter,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PomodoroCurrentStateDto(
    string State,
    string Phase,
    int RemainingSeconds,
    int DurationSeconds,
    DateTime? StartedAt,
    DateTime? PausedAt,
    Guid? LinkedTaskId,
    string? LinkedTaskSource);

public sealed record PomodoroCurrentStateSnapshot(
    string State,
    string Phase,
    int RemainingSeconds,
    int DurationSeconds,
    DateTime? StartedAt = null,
    DateTime? PausedAt = null,
    Guid? LinkedTaskId = null,
    string? LinkedTaskSource = null);
