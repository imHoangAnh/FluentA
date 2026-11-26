namespace FluentA.Application.Common;

public sealed class OperationResult<T>
{
    private OperationResult(T? value, IApplicationError? error, bool isSuccess)
    {
        Value = value;
        Error = error;
        IsSuccess = isSuccess;
    }

    public bool IsSuccess { get; }
    public T? Value { get; }
    public IApplicationError? Error { get; }

    public static OperationResult<T> Success(T value) => new(value, null, true);

    public static OperationResult<T> Failure(IApplicationError error) =>
        new(default, error ?? throw new ArgumentNullException(nameof(error)), false);
}
