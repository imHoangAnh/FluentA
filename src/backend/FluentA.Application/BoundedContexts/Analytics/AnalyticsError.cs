using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Analytics;

public sealed record AnalyticsError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static AnalyticsError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 400, details);
}
