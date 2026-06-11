namespace FluentA.Application.BoundedContexts.Todo;

public sealed class NullTodoSyncNotifier : ITodoSyncNotifier
{
    public static readonly NullTodoSyncNotifier Instance = new();

    private NullTodoSyncNotifier()
    {
    }

    public Task TodoItemCheckedAsync(Guid userId, Guid todoId, bool isCompleted, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
