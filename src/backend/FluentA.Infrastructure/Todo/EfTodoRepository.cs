using FluentA.Application.BoundedContexts.Todo;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Services;
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

    public async Task<TodoCompletionMutationResult?> SetCompletionAsync(
        Guid userId,
        Guid todoId,
        bool isCompleted,
        DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
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
            var reminderTime = item.ReminderTime;
            var reminderTimeZoneId = item.ReminderTimeZoneId;
            item.MarkGeneratedOccurrenceEdited();
            item.SetCompleted(true, nowUtc);
            item.CancelUnsentReminder();

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
                    if (reminderTime is not null && reminderTimeZoneId is not null)
                    {
                        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(reminderTimeZoneId);
                        child.SetReminder(
                            reminderTime.Value,
                            reminderTimeZoneId,
                            TodoReminderSchedule.ResolveUtc(nextDate, reminderTime.Value, timeZone));
                    }

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

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
