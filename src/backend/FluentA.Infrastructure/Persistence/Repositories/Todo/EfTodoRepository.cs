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
        return await QueryActiveTodos()
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
        return await QueryActiveTodos()
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
        return QueryActiveTodos()
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

                    var sourceTagIds = await _dbContext.TodoItemTags
                        .Where(link => link.TodoItemId == item.Id)
                        .Select(link => link.TagId)
                        .ToListAsync(cancellationToken);
                    if (sourceTagIds.Count > 0)
                    {
                        var childLinks = sourceTagIds.Select(tagId => new TodoItemTag(child.Id, tagId));
                        await _dbContext.TodoItemTags.AddRangeAsync(childLinks, cancellationToken);
                    }

                    var sourceSubtasks = await _dbContext.TodoSubtasks
                        .Where(subtask => subtask.TodoItemId == item.Id && subtask.DeletedAt == null)
                        .OrderBy(subtask => subtask.SortOrder)
                        .ThenBy(subtask => subtask.CreatedAt)
                        .ToListAsync(cancellationToken);
                    if (sourceSubtasks.Count > 0)
                    {
                        var childSubtasks = sourceSubtasks
                            .Select((subtask, index) => TodoSubtask.Create(child.Id, subtask.Title, index, isCompleted: false));
                        await _dbContext.TodoSubtasks.AddRangeAsync(childSubtasks, cancellationToken);
                    }
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

    public async Task<IReadOnlyList<TodoPriority>> ListPrioritiesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.TodoPriorities
            .Where(priority => priority.UserId == userId && priority.DeletedAt == null)
            .OrderBy(priority => priority.SortOrder)
            .ThenBy(priority => priority.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<TodoPriority?> GetPriorityAsync(Guid userId, Guid priorityId, CancellationToken cancellationToken = default)
    {
        return _dbContext.TodoPriorities
            .FirstOrDefaultAsync(priority => priority.Id == priorityId && priority.UserId == userId && priority.DeletedAt == null, cancellationToken);
    }

    public Task<bool> PriorityNameExistsAsync(Guid userId, string normalizedName, Guid? excludePriorityId = null, CancellationToken cancellationToken = default)
    {
        return _dbContext.TodoPriorities.AnyAsync(
            priority => priority.UserId == userId
                && priority.DeletedAt == null
                && priority.NormalizedName == normalizedName
                && (!excludePriorityId.HasValue || priority.Id != excludePriorityId.Value),
            cancellationToken);
    }

    public async Task<int> NextPrioritySortOrderAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var maximum = await _dbContext.TodoPriorities
            .Where(priority => priority.UserId == userId && priority.DeletedAt == null)
            .Select(priority => (int?)priority.SortOrder)
            .MaxAsync(cancellationToken);
        return (maximum ?? -1) + 1;
    }

    public async Task AddPriorityAsync(TodoPriority priority, CancellationToken cancellationToken = default)
    {
        await _dbContext.TodoPriorities.AddAsync(priority, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdatePriorityAsync(TodoPriority priority, CancellationToken cancellationToken = default)
    {
        _dbContext.TodoPriorities.Update(priority);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeletePriorityAsync(Guid userId, Guid priorityId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var priority = await GetPriorityAsync(userId, priorityId, cancellationToken);
        if (priority is null)
        {
            return false;
        }

        priority.SoftDelete(nowUtc);
        var affectedItems = await _dbContext.TodoItems
            .Where(item => item.UserId == userId && item.PriorityId == priorityId && item.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var item in affectedItems)
        {
            item.SetPriority(null);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TodoTag>> ListTagsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.TodoTags
            .Where(tag => tag.UserId == userId && tag.DeletedAt == null)
            .OrderBy(tag => tag.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<TodoTag?> GetTagAsync(Guid userId, Guid tagId, CancellationToken cancellationToken = default)
    {
        return _dbContext.TodoTags
            .FirstOrDefaultAsync(tag => tag.Id == tagId && tag.UserId == userId && tag.DeletedAt == null, cancellationToken);
    }

    public async Task<IReadOnlyList<TodoTag>> GetTagsByIdsAsync(Guid userId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken = default)
    {
        if (tagIds.Count == 0)
        {
            return [];
        }

        return await _dbContext.TodoTags
            .Where(tag => tag.UserId == userId && tag.DeletedAt == null && tagIds.Contains(tag.Id))
            .ToListAsync(cancellationToken);
    }

    public Task<bool> TagNameExistsAsync(Guid userId, string normalizedName, CancellationToken cancellationToken = default)
    {
        return _dbContext.TodoTags.AnyAsync(
            tag => tag.UserId == userId && tag.DeletedAt == null && tag.NormalizedName == normalizedName,
            cancellationToken);
    }

    public async Task AddTagAsync(TodoTag tag, CancellationToken cancellationToken = default)
    {
        await _dbContext.TodoTags.AddAsync(tag, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteTagAsync(Guid userId, Guid tagId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var tag = await GetTagAsync(userId, tagId, cancellationToken);
        if (tag is null)
        {
            return false;
        }

        tag.SoftDelete(nowUtc);
        var links = await _dbContext.TodoItemTags
            .Where(link => link.TagId == tagId)
            .ToListAsync(cancellationToken);
        if (links.Count > 0)
        {
            _dbContext.TodoItemTags.RemoveRange(links);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task ReplaceItemTagsAsync(Guid todoItemId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken = default)
    {
        var existing = await _dbContext.TodoItemTags
            .Where(link => link.TodoItemId == todoItemId)
            .ToListAsync(cancellationToken);
        var desiredSet = tagIds.ToHashSet();

        var toRemove = existing.Where(link => !desiredSet.Contains(link.TagId)).ToList();
        if (toRemove.Count > 0)
        {
            _dbContext.TodoItemTags.RemoveRange(toRemove);
        }

        var existingSet = existing.Select(link => link.TagId).ToHashSet();
        var toAdd = desiredSet
            .Where(tagId => !existingSet.Contains(tagId))
            .Select(tagId => new TodoItemTag(todoItemId, tagId))
            .ToList();
        if (toAdd.Count > 0)
        {
            await _dbContext.TodoItemTags.AddRangeAsync(toAdd, cancellationToken);
        }

        if (toRemove.Count > 0 || toAdd.Count > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task<TodoSubtask?> GetSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.TodoSubtasks
            .Join(
                _dbContext.TodoItems.Where(item => item.Id == todoId && item.UserId == userId && item.DeletedAt == null),
                subtask => subtask.TodoItemId,
                item => item.Id,
                (subtask, _) => subtask)
            .FirstOrDefaultAsync(subtask => subtask.Id == subtaskId && subtask.DeletedAt == null, cancellationToken);
    }

    public async Task<int> NextSubtaskSortOrderAsync(Guid todoId, CancellationToken cancellationToken = default)
    {
        var maximum = await _dbContext.TodoSubtasks
            .Where(subtask => subtask.TodoItemId == todoId && subtask.DeletedAt == null)
            .Select(subtask => (int?)subtask.SortOrder)
            .MaxAsync(cancellationToken);
        return (maximum ?? -1) + 1;
    }

    public async Task AddSubtaskAsync(TodoSubtask subtask, CancellationToken cancellationToken = default)
    {
        await _dbContext.TodoSubtasks.AddAsync(subtask, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddSubtasksAsync(IReadOnlyList<TodoSubtask> subtasks, CancellationToken cancellationToken = default)
    {
        if (subtasks.Count == 0)
        {
            return;
        }

        await _dbContext.TodoSubtasks.AddRangeAsync(subtasks, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateSubtaskAsync(TodoSubtask subtask, CancellationToken cancellationToken = default)
    {
        _dbContext.TodoSubtasks.Update(subtask);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var subtask = await GetSubtaskAsync(userId, todoId, subtaskId, cancellationToken);
        if (subtask is null)
        {
            return false;
        }

        subtask.SoftDelete(nowUtc);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<TodoItem> QueryActiveTodos() =>
        _dbContext.TodoItems
            .Include(item => item.Priority)
            .Include(item => item.Subtasks.Where(subtask => subtask.DeletedAt == null))
            .Include(item => item.TodoItemTags)
                .ThenInclude(link => link.Tag)
            .AsSplitQuery();

    private Task LockUserTodoMutationsAsync(Guid userId, CancellationToken cancellationToken) =>
        _dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({userId.ToString()}, 0))",
            cancellationToken);

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
