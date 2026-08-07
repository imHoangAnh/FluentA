namespace FluentA.Application.BoundedContexts.Project;

public sealed class NullProjectSyncNotifier : IProjectSyncNotifier
{
    public static NullProjectSyncNotifier Instance { get; } = new();

    private NullProjectSyncNotifier()
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
