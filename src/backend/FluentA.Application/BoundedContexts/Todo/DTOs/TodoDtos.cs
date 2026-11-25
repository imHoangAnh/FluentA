using System.Text.Json.Serialization;

namespace FluentA.Application.BoundedContexts.Todo.DTOs;

public sealed record TodoPriorityDto(
    Guid Id,
    string Name,
    string Tone,
    int SortOrder);

public sealed record CreateTodoPriorityRequest(
    string Name,
    string? Tone = null);

public sealed record UpdateTodoPriorityRequest(
    string? Name = null,
    string? Tone = null,
    int? SortOrder = null);

public sealed record TodoTagDto(
    Guid Id,
    string Name);

public sealed record CreateTodoTagRequest(
    string Name);

public sealed record TodoSubtaskDto(
    Guid Id,
    string Title,
    bool IsCompleted,
    int SortOrder);

public sealed record CreateTodoSubtaskRequest(
    string Title);

public sealed record UpdateTodoSubtaskRequest(
    string? Title = null,
    bool? IsCompleted = null,
    int? SortOrder = null);

public sealed record CreateTodoItemRequest(
    string Title,
    string Date,
    string? Note = null,
    bool IsImportant = false,
    string? RepeatPattern = null,
    Guid? PriorityId = null,
    string? ScheduledStartTime = null,
    string? ScheduledEndTime = null,
    int? EstimatedMinutes = null,
    IReadOnlyList<Guid>? TagIds = null);

public sealed class UpdateTodoItemRequest
{
    private string? _repeatPattern;
    private Guid? _priorityId;
    private string? _scheduledStartTime;
    private string? _scheduledEndTime;
    private int? _estimatedMinutes;
    private IReadOnlyList<Guid>? _tagIds;

    public UpdateTodoItemRequest()
    {
    }

    public UpdateTodoItemRequest(
        string? Title = null,
        string? Note = null,
        bool? IsCompleted = null,
        bool? IsImportant = null,
        string? Date = null,
        int? SortOrder = null)
    {
        this.Title = Title;
        this.Note = Note;
        this.IsCompleted = IsCompleted;
        this.IsImportant = IsImportant;
        this.Date = Date;
        this.SortOrder = SortOrder;
    }

    public string? Title { get; init; }
    public string? Note { get; init; }
    public bool? IsCompleted { get; init; }
    public bool? IsImportant { get; init; }
    public string? Date { get; init; }
    public int? SortOrder { get; init; }

    public string? RepeatPattern
    {
        get => _repeatPattern;
        init
        {
            _repeatPattern = value;
            IsRepeatPatternSpecified = true;
        }
    }

    public Guid? PriorityId
    {
        get => _priorityId;
        init
        {
            _priorityId = value;
            IsPriorityIdSpecified = true;
        }
    }

    public string? ScheduledStartTime
    {
        get => _scheduledStartTime;
        init
        {
            _scheduledStartTime = value;
            IsScheduledStartTimeSpecified = true;
        }
    }

    public string? ScheduledEndTime
    {
        get => _scheduledEndTime;
        init
        {
            _scheduledEndTime = value;
            IsScheduledEndTimeSpecified = true;
        }
    }

    public int? EstimatedMinutes
    {
        get => _estimatedMinutes;
        init
        {
            _estimatedMinutes = value;
            IsEstimatedMinutesSpecified = true;
        }
    }

    public IReadOnlyList<Guid>? TagIds
    {
        get => _tagIds;
        init
        {
            _tagIds = value;
            IsTagIdsSpecified = true;
        }
    }

    [JsonIgnore]
    public bool IsRepeatPatternSpecified { get; private set; }

    [JsonIgnore]
    public bool IsPriorityIdSpecified { get; private set; }

    [JsonIgnore]
    public bool IsScheduledStartTimeSpecified { get; private set; }

    [JsonIgnore]
    public bool IsScheduledEndTimeSpecified { get; private set; }

    [JsonIgnore]
    public bool IsEstimatedMinutesSpecified { get; private set; }

    [JsonIgnore]
    public bool IsTagIdsSpecified { get; private set; }
}

public sealed record TodoItemDto(
    Guid Id,
    string Title,
    string? Note,
    string Date,
    int SortOrder,
    bool IsCompleted,
    bool IsImportant,
    string? RepeatPattern,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? WarningCode = null,
    Guid? PriorityId = null,
    TodoPriorityDto? Priority = null,
    string? ScheduledStartTime = null,
    string? ScheduledEndTime = null,
    int? EstimatedMinutes = null,
    IReadOnlyList<TodoTagDto>? Tags = null,
    IReadOnlyList<TodoSubtaskDto>? Subtasks = null);
