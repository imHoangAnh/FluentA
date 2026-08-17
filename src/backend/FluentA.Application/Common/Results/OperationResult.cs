namespace FluentA.Application.Common;

public sealed class OperationResult<T>
{
    private OperationResult(T? value, object? error, bool isSuccess)
    {
        Value = value;
        Error = error;
        IsSuccess = isSuccess;
    }

    public bool IsSuccess { get; }
    public T? Value { get; }
    public object? Error { get; }

    public static OperationResult<T> Success(T value) => new(value, null, true);

    public static OperationResult<T> Failure(object error) => new(default, error, false);
}
