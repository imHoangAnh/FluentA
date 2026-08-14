namespace FluentA.Application.BoundedContexts.Pomodoro;

public sealed record PomodoroError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static PomodoroError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static PomodoroError InvalidState(string message) =>
        new("POMODORO_INVALID_STATE", message, 409);

    public static PomodoroError LinkedTaskNotFound() =>
        new("POMODORO_LINKED_TASK_NOT_FOUND", "The linked task was not found.", 404);
}
