using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IPracticeTransaction
{
    Task<OperationResult<T>> ExecuteAsync<T>(Guid userId, Guid sessionId,
        Func<CancellationToken, Task<OperationResult<T>>> operation,
        CancellationToken cancellationToken = default);

    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
