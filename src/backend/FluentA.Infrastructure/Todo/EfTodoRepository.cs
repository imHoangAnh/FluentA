using FluentA.Application.BoundedContexts.Todo;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Todo;

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
    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
