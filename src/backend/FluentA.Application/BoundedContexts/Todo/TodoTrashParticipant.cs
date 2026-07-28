using System.Globalization;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Todo;

public sealed class TodoTrashParticipant : ITrashParticipant
{
    private readonly ITodoRepository _todos;

    public TodoTrashParticipant(ITodoRepository todos)
    {
        _todos = todos;
    }

    public TrashEntityKind EntityKind => TrashEntityKind.Todo;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(
        Guid userId,
        Guid entityId,
        DateTime nowUtc,
        TimeSpan retention,
        CancellationToken cancellationToken = default)
    {
        var root = await _todos.GetActiveForTrashAsync(userId, entityId, cancellationToken);
        if (root is null)
        {
            return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
        }

        var allOwned = await _todos.ListOwnedIncludingDeletedAsync(userId, cancellationToken);
        var group = SelectGroup(root, allOwned, deletedAt: null);
        foreach (var item in group)
        {
            item.CancelUnsentReminder();
            item.SoftDelete(nowUtc);
        }

        await _todos.UpdateRangeAsync(group, cancellationToken);
        return OperationResult<TrashEntry>.Success(TrashEntry.Create(
            userId,
            EntityKind,
            root.Id,
            root.Title,
            root.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            nowUtc,
            retention));
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var allOwned = await _todos.ListOwnedIncludingDeletedAsync(entry.UserId, cancellationToken);
        var root = allOwned.SingleOrDefault(item => item.Id == entry.EntityId && item.DeletedAt == entry.TrashedAt);
        if (root is null)
        {
            return false;
        }

        var group = SelectGroup(root, allOwned, entry.TrashedAt);
        foreach (var item in group)
        {
            item.RestoreFromTrash();
        }

        await _todos.UpdateRangeAsync(group, cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var allOwned = await _todos.ListOwnedIncludingDeletedAsync(entry.UserId, cancellationToken);
        var root = allOwned.SingleOrDefault(item => item.Id == entry.EntityId && item.DeletedAt == entry.TrashedAt);
        if (root is not null)
        {
            await _todos.RemoveRangeAsync(SelectGroup(root, allOwned, entry.TrashedAt), cancellationToken);
        }

        return true;
    }

    private static IReadOnlyList<TodoItem> SelectGroup(TodoItem root, IReadOnlyList<TodoItem> allOwned, DateTime? deletedAt)
    {
        var candidates = allOwned
            .Where(item => deletedAt is null ? item.DeletedAt is null : item.DeletedAt == deletedAt)
            .ToList();
        var childrenByParent = candidates
            .Where(item => item.GeneratedFromTodoId.HasValue)
            .GroupBy(item => item.GeneratedFromTodoId!.Value)
            .ToDictionary(group => group.Key, group => group.OrderBy(item => item.Date).ToList());
        var result = new List<TodoItem> { root };
        var visited = new HashSet<Guid> { root.Id };
        var pending = new Queue<Guid>();
        pending.Enqueue(root.Id);
        while (pending.TryDequeue(out var parentId))
        {
            if (!childrenByParent.TryGetValue(parentId, out var children))
            {
                continue;
            }

            foreach (var child in children.Where(child => child.Date >= root.Date && visited.Add(child.Id)))
            {
                result.Add(child);
                pending.Enqueue(child.Id);
            }
        }

        return result;
    }
}
