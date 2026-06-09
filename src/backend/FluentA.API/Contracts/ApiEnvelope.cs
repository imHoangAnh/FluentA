namespace FluentA.API.Contracts;

public sealed record ApiEnvelope<T>(bool Success, T? Data, ApiErrorEnvelope? Error = null)
{
    public static ApiEnvelope<T> Ok(T data) => new(true, data);
    public static ApiEnvelope<T> Fail(ApiErrorEnvelope error) => new(false, default, error);
}

public sealed record ApiErrorEnvelope(string Code, string Message, object? Details = null);
