using System.Globalization;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Domain.BoundedContexts.Project.Entities;

namespace FluentA.Application.BoundedContexts.Project;

internal static class ProjectDtoMapper
{
    private const string DateFormat = "yyyy-MM-dd";

    public static ProjectBoardSummaryDto ToSummary(ProjectBoard board)
    {
        var activeColumns = board.Columns.Where(column => column.DeletedAt is null).ToList();
        return new ProjectBoardSummaryDto(
            board.Id,
            board.Name,
            activeColumns.Count,
            activeColumns.Sum(column => column.Cards.Count(card => card.DeletedAt is null)),
            board.CreatedAt,
            board.UpdatedAt);
    }

    public static ProjectBoardDetailDto ToDetail(ProjectBoard board)
    {
        var milestones = board.Milestones
            .Where(milestone => milestone.DeletedAt is null)
            .OrderBy(milestone => milestone.SortOrder)
            .ThenBy(milestone => milestone.CreatedAt)
            .Select(ToMilestoneDto)
            .ToList();

        var labels = board.Labels
            .Where(label => label.DeletedAt is null)
            .OrderBy(label => label.Name, StringComparer.OrdinalIgnoreCase)
            .Select(ToLabelDto)
            .ToList();

        return new ProjectBoardDetailDto(
            board.Id,
            board.Name,
            board.Columns
                .Where(column => column.DeletedAt is null)
                .OrderBy(column => column.SortOrder)
                .ThenBy(column => column.CreatedAt)
                .Select(ToColumnDto)
                .ToList(),
            board.CreatedAt,
            board.UpdatedAt,
            milestones,
            labels);
    }

    public static ProjectColumnDto ToColumnDto(ProjectColumn column)
    {
        return new ProjectColumnDto(
            column.Id,
            column.Name,
            column.SortOrder,
            column.Cards
                .Where(card => card.DeletedAt is null)
                .OrderBy(card => card.SortOrder)
                .ThenBy(card => card.CreatedAt)
                .Select(ToCardDto)
                .ToList(),
            column.CreatedAt,
            column.UpdatedAt);
    }

    public static ProjectCardDto ToCardDto(ProjectCard card)
    {
        var activeMilestone = card.Milestone is { DeletedAt: null } milestone
            ? ToMilestoneDto(milestone)
            : null;
        var milestoneId = activeMilestone?.Id ?? (card.Milestone is null ? card.MilestoneId : null);

        var activeLabel = card.Label is { DeletedAt: null } label
            ? ToLabelDto(label)
            : null;
        var labelId = activeLabel?.Id ?? (card.Label is null ? card.LabelId : null);

        var checklistItems = card.ChecklistItems
            .Where(item => item.DeletedAt is null)
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.CreatedAt)
            .Select(ToChecklistItemDto)
            .ToList();

        return new ProjectCardDto(
            card.Id,
            card.ColumnId,
            card.Title,
            card.Description,
            card.Priority.ToString(),
            card.Deadline is null ? null : card.Deadline.Value.ToString(DateFormat, CultureInfo.InvariantCulture),
            card.SortOrder,
            card.CreatedAt,
            card.UpdatedAt,
            milestoneId,
            activeMilestone,
            labelId,
            activeLabel,
            checklistItems);
    }

    public static ProjectMilestoneDto ToMilestoneDto(ProjectMilestone milestone)
    {
        return new ProjectMilestoneDto(milestone.Id, milestone.BoardId, milestone.Name, milestone.SortOrder);
    }

    public static ProjectLabelDto ToLabelDto(ProjectLabel label)
    {
        return new ProjectLabelDto(label.Id, label.BoardId, label.Name, label.Tone);
    }

    public static ProjectCardChecklistItemDto ToChecklistItemDto(ProjectCardChecklistItem item)
    {
        return new ProjectCardChecklistItemDto(item.Id, item.Title, item.IsCompleted, item.SortOrder);
    }
}
