using FluentA.Domain.BoundedContexts.Note.Entities;

namespace FluentA.Application.BoundedContexts.Note;

public interface INoteRepository
{
    Task<IReadOnlyList<NoteBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NoteBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<NotePage?> GetPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default);
    Task<NoteBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task<NotePage?> GetTrashedPageAsync(Guid userId, Guid pageId, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task<IReadOnlySet<Guid>> GetPageAssetIdsAsync(Guid pageId, CancellationToken cancellationToken = default);
    Task<IReadOnlySet<Guid>> GetPageAssetIdsAsync(IReadOnlyCollection<Guid> pageIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<Guid, Guid>> GetAttachedAssetPageIdsAsync(IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default);
    Task ReplacePageAssetLinksAsync(Guid pageId, IReadOnlySet<Guid> assetIds, CancellationToken cancellationToken = default);
    Task AddBoardAsync(NoteBoard board, CancellationToken cancellationToken = default);
    Task AddPageAsync(NotePage page, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(NoteBoard board, CancellationToken cancellationToken = default);
    Task UpdatePageAsync(NotePage page, CancellationToken cancellationToken = default);
    Task SoftDeleteBoardAsync(NoteBoard board, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task SoftDeletePageAsync(NotePage page, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task RemoveBoardAsync(NoteBoard board, CancellationToken cancellationToken = default);
    Task RemovePageAsync(NotePage page, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
