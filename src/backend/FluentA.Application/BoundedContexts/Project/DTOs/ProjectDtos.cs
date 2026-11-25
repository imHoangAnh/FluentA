using System.Text.Json.Serialization;

namespace FluentA.Application.BoundedContexts.Project.DTOs;

public sealed record ProjectMilestoneDto(
    Guid Id,
    Guid BoardId,
    string Name,
    int SortOrder);

public sealed record ProjectLabelDto(
    Guid Id,
    Guid BoardId,
    string Name,
    string Tone);

public sealed record ProjectCardChecklistItemDto(
    Guid Id,
    string Title,
    bool IsCompleted,
    int SortOrder);

public sealed record CreateProjectMilestoneRequest(string Name);

public sealed record UpdateProjectMilestoneRequest(string? Name = null, int? SortOrder = null);

public sealed record CreateProjectLabelRequest(string Name, string? Tone = null);

public sealed record UpdateProjectLabelRequest(string? Name = null, string? Tone = null);

public sealed record CreateProjectChecklistItemRequest(string Title);

public sealed record UpdateProjectChecklistItemRequest(string? Title = null, bool? IsCompleted = null, int? SortOrder = null);

public sealed record ProjectBoardSummaryDto(Guid Id, string Name, int ColumnCount, int CardCount, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record ProjectBoardDetailDto(
    Guid Id,
    string Name,
    IReadOnlyList<ProjectColumnDto> Columns,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<ProjectMilestoneDto>? Milestones = null,
    IReadOnlyList<ProjectLabelDto>? Labels = null);

public sealed record ProjectColumnDto(Guid Id, string Name, int SortOrder, IReadOnlyList<ProjectCardDto> Cards, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record ProjectCardDto(
    Guid Id,
    Guid ColumnId,
    string Title,
    string? Description,
    string Priority,
    string? Deadline,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    Guid? MilestoneId = null,
    ProjectMilestoneDto? Milestone = null,
    Guid? LabelId = null,
    ProjectLabelDto? Label = null,
    IReadOnlyList<ProjectCardChecklistItemDto>? ChecklistItems = null);

public sealed record CreateProjectBoardRequest(string Name);

public sealed record UpdateProjectBoardRequest(string? Name = null);

public sealed record CreateProjectColumnRequest(string Name);

public sealed record UpdateProjectColumnRequest(string? Name = null, int? SortOrder = null);

public sealed record CreateProjectCardRequest(
    Guid ColumnId,
    string Title,
    string? Description = null,
    string? Priority = null,
    string? Deadline = null,
    Guid? MilestoneId = null,
    Guid? LabelId = null,
    IReadOnlyList<string>? ChecklistTitles = null);

public sealed class UpdateProjectCardRequest
{
    private Guid? _milestoneId;
    private Guid? _labelId;

    public UpdateProjectCardRequest()
    {
    }

    public UpdateProjectCardRequest(
        string? Title = null,
        string? Description = null,
        string? Priority = null,
        string? Deadline = null)
    {
        this.Title = Title;
        this.Description = Description;
        this.Priority = Priority;
        this.Deadline = Deadline;
    }

    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Priority { get; init; }
    public string? Deadline { get; init; }

    public Guid? MilestoneId
    {
        get => _milestoneId;
        init
        {
            _milestoneId = value;
            IsMilestoneIdSpecified = true;
        }
    }

    public Guid? LabelId
    {
        get => _labelId;
        init
        {
            _labelId = value;
            IsLabelIdSpecified = true;
        }
    }

    [JsonIgnore]
    public bool IsMilestoneIdSpecified { get; private set; }

    [JsonIgnore]
    public bool IsLabelIdSpecified { get; private set; }
}

public sealed record MoveProjectCardRequest(Guid ColumnId, int SortOrder);
