namespace FluentA.Application.BoundedContexts.Project;

public interface IProjectSyncNotifier
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
