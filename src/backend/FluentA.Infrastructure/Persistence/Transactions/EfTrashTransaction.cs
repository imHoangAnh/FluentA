using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Infrastructure.Persistence;

namespace FluentA.Infrastructure.Persistence.Transactions;

public sealed class EfTrashTransaction : ITrashTransaction
{
    private readonly AppDbContext _dbContext;

    public EfTrashTransaction(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<OperationResult<T>> ExecuteOperationAsync<T>(
        Func<CancellationToken, Task<OperationResult<T>>> action,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        OperationResult<T> result;
        try
        {
            result = await action(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }

        if (!result.IsSuccess)
        {
            await transaction.RollbackAsync(CancellationToken.None);
            return result;
        }

        try
        {
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            throw;
        }
    }

    public async Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var result = await action(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
