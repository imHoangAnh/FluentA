namespace FluentA.Application.BoundedContexts.Todo;

public interface ITodoSyncNotifier
{
    Task TodoItemCheckedAsync(Guid userId, Guid todoId, bool isCompleted, CancellationToken cancellationToken = default);
}
