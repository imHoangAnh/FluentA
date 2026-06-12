namespace FluentA.Application.BoundedContexts.Kanban;

public interface IKanbanSyncNotifier
{
    Task CardMovedAsync(
        Guid userId,
        Guid boardId,
        Guid cardId,
        Guid fromColumnId,
        Guid toColumnId,
        int sortOrder,
        CancellationToken cancellationToken = default);
}
