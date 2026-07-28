using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;

namespace FluentA.Application.BoundedContexts.Habit;

public sealed class HabitTrashParticipant : ITrashParticipant
{
    private readonly IHabitRepository _habits;

    public HabitTrashParticipant(IHabitRepository habits)
    {
        _habits = habits;
    }

    public TrashEntityKind EntityKind => TrashEntityKind.Habit;

    public async Task<OperationResult<TrashEntry>> MoveToTrashAsync(Guid userId, Guid entityId, DateTime nowUtc, TimeSpan retention, CancellationToken cancellationToken = default)
    {
        var habit = await _habits.GetAsync(userId, entityId, cancellationToken);
        if (habit is null)
        {
            return OperationResult<TrashEntry>.Failure(TrashError.NotFound());
        }

        habit.MoveToTrash(nowUtc);
        await _habits.UpdateAsync(habit, cancellationToken);
        return OperationResult<TrashEntry>.Success(TrashEntry.Create(
            userId, EntityKind, habit.Id, habit.Name, "Habit tracker", nowUtc, retention));
    }

    public async Task<bool> RestoreAsync(TrashEntry entry, DateTime nowUtc, TimeZoneInfo? timeZone, CancellationToken cancellationToken = default)
    {
        var habit = await _habits.GetTrashedAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (habit is null)
        {
            return false;
        }

        habit.RestoreFromTrash(nowUtc);
        await _habits.UpdateAsync(habit, cancellationToken);
        return true;
    }

    public async Task<bool> PermanentlyDeleteAsync(TrashEntry entry, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var habit = await _habits.GetTrashedAsync(entry.UserId, entry.EntityId, entry.TrashedAt, cancellationToken);
        if (habit is null)
        {
            return true;
        }

        await _habits.RemoveAsync(habit, cancellationToken);
        return true;
    }
}
