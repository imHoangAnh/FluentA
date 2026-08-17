namespace FluentA.Application.Common;

public interface IApplicationError
{
    string Code { get; }
    string Message { get; }
    int StatusCode { get; }
    object? Details => null;
}
