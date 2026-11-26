using FluentA.Application.BoundedContexts.Todo;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Services;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Todo;

public sealed class EfTodoRepository : ITodoRepository
{
    private readonly AppDbContext _dbContext;

    public EfTodoRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeDate(date);
        return await _dbContext.TodoItems
            .Where(item => item.UserId == userId && item.Date == normalized && item.DeletedAt == null)
            .OrderBy(item => item.IsCompleted)
            .ThenBy(item => item.SortOrder)
            .ThenByDescending(item => item.IsCompleted ? item.CompletedAt : item.CreatedAt)
            .ThenByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var start = NormalizeDate(startDate);
        var end = NormalizeDate(endDate);
        return await _dbContext.TodoItems
            .Where(item => item.UserId == userId && item.Date >= start && item.Date <= end && item.DeletedAt == null)
            .OrderBy(item => item.Date)
            .ThenBy(item => item.IsCompleted)
            .ThenBy(item => item.SortOrder)
            .ThenByDescending(item => item.IsCompleted ? item.CompletedAt : item.CreatedAt)
            .ThenByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
    {
        return _dbContext.TodoItems
            .FirstOrDefaultAsync(item => item.Id == todoId && item.UserId == userId && item.DeletedAt == null, cancellationToken);
    }

    public async Task<bool> SoftDeleteFutureOccurrencesAsync(
        Guid userId, Guid todoId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        await LockUserTodoMutationsAsync(userId, cancellationToken);
        var root = await _dbContext.TodoItems
            .FromSqlInterpolated($"SELECT * FROM todo_items WHERE id = {todoId} AND user_id = {userId} AND deleted_at IS NULL FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);
        if (root is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        var candidates = await _dbContext.TodoItems
            .Where(item => item.UserId == userId && item.DeletedAt == null)
            .ToListAsync(cancellationToken);
        var childrenByParent = candidates
            .Where(item => item.GeneratedFromTodoId.HasValue)
            .GroupBy(item => item.GeneratedFromTodoId!.Value)
            .ToDictionary(group => group.Key, group => group.ToList());
        var pending = new Queue<TodoItem>();
        var visited = new HashSet<Guid> { root.Id };
        pending.Enqueue(root);
        while (pending.TryDequeue(out var item))
        {
            if (item.Id == root.Id || item.Date >= root.Date)
            {
                item.SoftDelete(nowUtc);
            }
            if (!childrenByParent.TryGetValue(item.Id, out var children)) continue;
            foreach (var child in children.Where(child => visited.Add(child.Id)))
            {
                pending.Enqueue(child);
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task AddAsync(TodoItem item, CancellationToken cancellationToken = default)
    {
        await _dbContext.TodoItems.AddAsync(item, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> NextSortOrderAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeDate(date);
        var maximum = await _dbContext.TodoItems
            .Where(item => item.UserId == userId && item.Date == normalized && item.DeletedAt == null)
            .Select(item => (int?)item.SortOrder)
            .MaxAsync(cancellationToken);
        return (maximum ?? -1) + 1;
    }

    public async Task UpdateAsync(TodoItem item, CancellationToken cancellationToken = default)
    {
        _dbContext.TodoItems.Update(item);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateRangeAsync(IReadOnlyList<TodoItem> items, CancellationToken cancellationToken = default)
    {
        _dbContext.TodoItems.UpdateRange(items);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<TodoCompletionMutationResult?> SetCompletionAsync(
        Guid userId,
        Guid todoId,
        bool isCompleted,
        DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        await LockUserTodoMutationsAsync(userId, cancellationToken);
        var item = await _dbContext.TodoItems
            .FromSqlInterpolated($"SELECT * FROM todo_items WHERE id = {todoId} AND user_id = {userId} AND deleted_at IS NULL FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

        if (item is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        if (item.IsCompleted == isCompleted)
        {
            await transaction.CommitAsync(cancellationToken);
            return new TodoCompletionMutationResult(item, false);
        }

        var nextOccurrenceRetained = false;
        if (isCompleted)
        {
            item.MarkGeneratedOccurrenceEdited();
            item.SetCompleted(true, nowUtc);

            if (item.RepeatPattern is not null)
            {
                var existingChild = await _dbContext.TodoItems.FirstOrDefaultAsync(
                    candidate => candidate.UserId == userId
                        && candidate.GeneratedFromTodoId == item.Id
                        && candidate.DeletedAt == null,
                    cancellationToken);

                if (existingChild is null)
                {
                    var nextDate = TodoRepeatSchedule.NextDate(item.Date, item.RepeatPattern.Value);
                    var sortOrder = await NextSortOrderAsync(userId, nextDate, cancellationToken);
                    var child = TodoItem.CreateGeneratedOccurrence(item, nextDate, sortOrder);
                    await _dbContext.TodoItems.AddAsync(child, cancellationToken);
                }
            }
        }
        else
        {
            var generatedChild = await _dbContext.TodoItems.FirstOrDefaultAsync(
                candidate => candidate.UserId == userId
                    && candidate.GeneratedFromTodoId == item.Id
                    && candidate.DeletedAt == null,
                cancellationToken);

            if (generatedChild is not null)
            {
                if (generatedChild.IsGeneratedOccurrencePristine)
                {
                    generatedChild.SoftDelete();
                }
                else
                {
                    nextOccurrenceRetained = true;
                }
            }

            item.MarkGeneratedOccurrenceEdited();
            item.SetCompleted(false, nowUtc);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new TodoCompletionMutationResult(item, nextOccurrenceRetained);
    }

    private Task LockUserTodoMutationsAsync(Guid userId, CancellationToken cancellationToken) =>
        _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({userId.ToString()}, 0))",
            cancellationToken);

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
