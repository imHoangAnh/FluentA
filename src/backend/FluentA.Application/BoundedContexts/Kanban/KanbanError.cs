namespace FluentA.Application.BoundedContexts.Kanban;

public sealed record KanbanError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static KanbanError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static KanbanError NotFound() =>
        new("KANBAN_NOT_FOUND", "The requested Kanban resource could not be found.", 404);

    public static KanbanError ColumnNotEmpty() =>
        new("KANBAN_COLUMN_NOT_EMPTY", "Only empty Kanban columns can be deleted.", 409);
}
