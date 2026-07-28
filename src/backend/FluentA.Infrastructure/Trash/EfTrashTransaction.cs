using FluentA.Application.BoundedContexts.Trash;
using FluentA.Infrastructure.Persistence;

namespace FluentA.Infrastructure.Trash;

public sealed class EfTrashTransaction : ITrashTransaction
{
    private readonly AppDbContext _dbContext;

    public EfTrashTransaction(AppDbContext dbContext)
    {
        _dbContext = dbContext;
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
