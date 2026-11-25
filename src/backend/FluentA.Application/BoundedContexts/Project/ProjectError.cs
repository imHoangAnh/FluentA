namespace FluentA.Application.BoundedContexts.Project;

public sealed record ProjectError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static ProjectError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 400, details);

    public static ProjectError NotFound(
        string code = "PROJECT_NOT_FOUND",
        string message = "The requested Project resource could not be found.") =>
        new(code, message, 404);

    public static ProjectError ColumnNotEmpty() =>
        new("PROJECT_COLUMN_NOT_EMPTY", "Only empty Project columns can be deleted.", 409);

    public static ProjectError Conflict(string code, string message) =>
        new(code, message, 409);
}
