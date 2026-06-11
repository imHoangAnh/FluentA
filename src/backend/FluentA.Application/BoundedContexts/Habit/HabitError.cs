namespace FluentA.Application.BoundedContexts.Habit;

public sealed record HabitError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static HabitError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static HabitError NotFound() =>
        new("HABIT_NOT_FOUND", "The requested habit could not be found.", 404);
}
