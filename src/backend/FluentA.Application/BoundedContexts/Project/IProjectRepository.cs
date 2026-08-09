using FluentA.Domain.BoundedContexts.Project.Entities;

namespace FluentA.Application.BoundedContexts.Project;

public interface IProjectRepository
{
    Task<IReadOnlyList<ProjectBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ProjectBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<ProjectColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    Task<ProjectCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
    Task<ProjectColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default);
    Task<ProjectBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task<ProjectColumn?> GetTrashedColumnAsync(Guid userId, Guid columnId, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task<ProjectCard?> GetTrashedCardAsync(Guid userId, Guid cardId, DateTime trashedAt, CancellationToken cancellationToken = default);
    Task<int> NextColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default);
    Task<int> NextCardSortOrderAsync(Guid columnId, CancellationToken cancellationToken = default);
    Task AddBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default);
    Task AddColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default);
    Task AddCardAsync(ProjectCard card, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default);
    Task UpdateColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default);
    Task UpdateCardAsync(ProjectCard card, CancellationToken cancellationToken = default);
    Task RemoveBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default);
    Task RemoveColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default);
    Task RemoveCardAsync(ProjectCard card, CancellationToken cancellationToken = default);
}
