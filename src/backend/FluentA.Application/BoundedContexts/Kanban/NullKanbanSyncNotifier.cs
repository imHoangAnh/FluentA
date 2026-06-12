namespace FluentA.Application.BoundedContexts.Kanban;

public sealed class NullKanbanSyncNotifier : IKanbanSyncNotifier
{
    public static NullKanbanSyncNotifier Instance { get; } = new();

    private NullKanbanSyncNotifier()
    {
    }

    public Task CardMovedAsync(
        Guid userId,
        Guid boardId,
        Guid cardId,
        Guid fromColumnId,
        Guid toColumnId,
        int sortOrder,
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
