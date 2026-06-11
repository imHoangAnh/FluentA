namespace FluentA.Application.BoundedContexts.Countdown;

public sealed record CountdownError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static CountdownError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static CountdownError NotFound() =>
        new("COUNTDOWN_NOT_FOUND", "The requested countdown event could not be found.", 404);
}
