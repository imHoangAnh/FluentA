using System.Collections;

namespace FluentA.API.Contracts;

public static class ApiResponseFactory
{
    public static ApiResponse<object> Fail(string code, string message, object? details = null, string? traceId = null) =>
        ApiResponse<object>.Fail(message, ToErrors(code, message, details), traceId);

    public static List<ApiError> ToErrors(string code, string message, object? details)
    {
        if (details is IReadOnlyDictionary<string, string[]> fields)
        {
            var errors = fields
                .SelectMany(field => field.Value.Select(value => new ApiError(code, value, field.Key)))
                .ToList();
            if (errors.Count > 0) return errors;
        }

        if (details is IDictionary dictionary)
        {
            var errors = new List<ApiError>();
            foreach (DictionaryEntry entry in dictionary)
            {
                if (entry.Key is not string field || entry.Value is not IEnumerable<string> messages) continue;
                errors.AddRange(messages.Select(value => new ApiError(code, value, field)));
            }
            if (errors.Count > 0) return errors;
        }

        return [new ApiError(code, message)];
    }
}
