namespace FluentA.Application.BoundedContexts.Todo;

public sealed record TodoError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static TodoError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 400, details);

    public static TodoError NotFound(
        string code = "TODO_NOT_FOUND",
        string message = "The requested todo item could not be found.") =>
        new(code, message, 404);

    public static TodoError Conflict(string code, string message) =>
        new(code, message, 409);
}
