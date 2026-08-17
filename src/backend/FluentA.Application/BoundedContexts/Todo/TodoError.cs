namespace FluentA.Application.BoundedContexts.Todo;

public sealed record TodoError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static TodoError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static TodoError NotFound() =>
        new("TODO_NOT_FOUND", "The requested todo item could not be found.", 404);
}
