using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Trash;

public interface ITrashTransaction
{
    /// <summary>Commits successful operations and rolls back expected failures and exceptions.</summary>
    Task<OperationResult<T>> ExecuteOperationAsync<T>(
        Func<CancellationToken, Task<OperationResult<T>>> action,
        CancellationToken cancellationToken = default);

    Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken = default);
}
