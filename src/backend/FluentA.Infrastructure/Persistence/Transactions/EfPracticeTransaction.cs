using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Transactions;

public sealed class EfPracticeTransaction(AppDbContext context) : IPracticeTransaction
{
    public Task SaveChangesAsync(CancellationToken cancellationToken = default) => context.SaveChangesAsync(cancellationToken);

    public async Task<OperationResult<T>> ExecuteAsync<T>(Guid userId, Guid sessionId,
        Func<CancellationToken, Task<OperationResult<T>>> operation,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            // Serialize mutations of one owned session, including replay checks.
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM practice_sessions WHERE id = {sessionId} AND user_id = {userId} FOR UPDATE",
                cancellationToken);
            // Reload targets read before the pronunciation provider call.
            context.ChangeTracker.Clear();
            var result = await operation(cancellationToken);
            if (result.IsSuccess) await transaction.CommitAsync(cancellationToken);
            else
            {
                await transaction.RollbackAsync(CancellationToken.None);
                context.ChangeTracker.Clear();
            }
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            context.ChangeTracker.Clear();
            throw;
        }
    }
}
