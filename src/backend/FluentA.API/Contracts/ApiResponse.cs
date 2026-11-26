using System.Diagnostics;

namespace FluentA.API.Contracts;

public sealed class ApiResponse<T>
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public T? Data { get; init; }
    public List<ApiError> Errors { get; init; } = [];
    public string? TraceId { get; init; }

    public static ApiResponse<T> Ok(T data, string? message = null, string? traceId = null) => new()
    {
        Success = true,
        Message = message,
        Data = data,
        TraceId = traceId ?? Activity.Current?.Id
    };

    public static ApiResponse<T> Fail(string message, IEnumerable<ApiError>? errors = null, string? traceId = null) => new()
    {
        Success = false,
        Message = message,
        Errors = errors?.ToList() ?? [],
        TraceId = traceId ?? Activity.Current?.Id
    };
}

public sealed record ApiError(string Code, string Message, string? Field = null);
