namespace FluentA.Application.BoundedContexts.Habit;

public sealed class NullHabitSyncNotifier : IHabitSyncNotifier
{
    public static NullHabitSyncNotifier Instance { get; } = new();

    private NullHabitSyncNotifier()
    {
    }

    public Task HabitCheckedAsync(Guid userId, Guid habitId, string date, bool isCompleted, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
