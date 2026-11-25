using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Application.BoundedContexts.Project.DTOs;

namespace FluentA.Application.BoundedContexts.Project;

public interface IProjectRepository
{
    Task<IReadOnlyList<ProjectBoardSummaryDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ProjectBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<ProjectColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    Task<ProjectCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
    Task<Guid?> GetBoardIdForCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
    Task<ProjectColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default);
    Task<int> NextColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default);
    Task<int> NextCardSortOrderAsync(Guid columnId, CancellationToken cancellationToken = default);
    Task AddBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default);
    Task AddColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default);
    Task AddCardAsync(ProjectCard card, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default);
    Task UpdateColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default);
    Task UpdateCardAsync(ProjectCard card, CancellationToken cancellationToken = default);

    Task<ProjectMilestone?> GetMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, CancellationToken cancellationToken = default);
    Task<bool> MilestoneNameExistsAsync(Guid boardId, string normalizedName, Guid? excludeMilestoneId = null, CancellationToken cancellationToken = default);
    Task<int> NextMilestoneSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default);
    Task AddMilestoneAsync(ProjectMilestone milestone, CancellationToken cancellationToken = default);
    Task UpdateMilestoneAsync(ProjectMilestone milestone, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, DateTime nowUtc, CancellationToken cancellationToken = default);

    Task<ProjectLabel?> GetLabelAsync(Guid userId, Guid boardId, Guid labelId, CancellationToken cancellationToken = default);
    Task<bool> LabelNameExistsAsync(Guid boardId, string normalizedName, Guid? excludeLabelId = null, CancellationToken cancellationToken = default);
    Task AddLabelAsync(ProjectLabel label, CancellationToken cancellationToken = default);
    Task UpdateLabelAsync(ProjectLabel label, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteLabelAsync(Guid userId, Guid boardId, Guid labelId, DateTime nowUtc, CancellationToken cancellationToken = default);

    Task<ProjectCardChecklistItem?> GetChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, CancellationToken cancellationToken = default);
    Task<int> NextChecklistSortOrderAsync(Guid cardId, CancellationToken cancellationToken = default);
    Task AddChecklistItemAsync(ProjectCardChecklistItem item, CancellationToken cancellationToken = default);
    Task AddChecklistItemsAsync(IReadOnlyList<ProjectCardChecklistItem> items, CancellationToken cancellationToken = default);
    Task UpdateChecklistItemAsync(ProjectCardChecklistItem item, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, DateTime nowUtc, CancellationToken cancellationToken = default);
}
