using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Pomodoro;

public interface IPomodoroService
{
    Task<OperationResult<PomodoroConfigDto>> GetConfigAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroConfigDto>> UpdateConfigAsync(Guid userId, UpdatePomodoroConfigRequest request, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroCurrentStateDto>> GetCurrentAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroCurrentStateDto>> StartAsync(Guid userId, StartPomodoroRequest request, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroCurrentStateDto>> PauseAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroCurrentStateDto>> ResumeAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroCurrentStateDto>> ResetAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroCurrentStateDto>> CompleteAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<PomodoroTodayDto>> GetTodayAsync(Guid userId, int utcOffsetMinutes, CancellationToken cancellationToken = default);
}
