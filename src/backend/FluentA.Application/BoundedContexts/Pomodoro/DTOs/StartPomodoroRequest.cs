namespace FluentA.Application.BoundedContexts.Pomodoro.DTOs;

public sealed record StartPomodoroRequest(Guid? LinkedTaskId = null, string? LinkedTaskSource = null);
