namespace FluentA.Application.BoundedContexts.Habit;

public interface IHabitSyncNotifier
{
    Task HabitCheckedAsync(Guid userId, Guid habitId, string date, bool isCompleted, CancellationToken cancellationToken = default);
}
