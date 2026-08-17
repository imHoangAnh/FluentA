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
            board.UpdatedAt);
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
        return new ProjectCardDto(
            card.Id,
            card.ColumnId,
            card.Title,
            card.Description,
            card.Priority.ToString(),
            card.Deadline is null ? null : card.Deadline.Value.ToString(DateFormat, CultureInfo.InvariantCulture),
            card.SortOrder,
            card.CreatedAt,
            card.UpdatedAt);
    }
}
