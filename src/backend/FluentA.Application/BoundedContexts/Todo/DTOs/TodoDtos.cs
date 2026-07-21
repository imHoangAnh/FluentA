using System.Text.Json.Serialization;

namespace FluentA.Application.BoundedContexts.Todo.DTOs;

public sealed record CreateTodoItemRequest(
    string Title,
    string Date,
    string? Note = null,
    bool IsImportant = false,
    string? RepeatPattern = null,
    TodoReminderRequest? Reminder = null);

public sealed record TodoReminderRequest(
    string Time,
    string TimeZoneId,
    DateTime ScheduledAtUtc);

public sealed record TodoReminderDto(
    string Time,
    string TimeZoneId,
    DateTime ScheduledAtUtc,
    DateTime? SentAtUtc);

public sealed class UpdateTodoItemRequest
{
    private string? _repeatPattern;
    private TodoReminderRequest? _reminder;

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

    [JsonIgnore]
    public bool IsRepeatPatternSpecified { get; private set; }

    public TodoReminderRequest? Reminder
    {
        get => _reminder;
        init
        {
            _reminder = value;
            IsReminderSpecified = true;
        }
    }

    [JsonIgnore]
    public bool IsReminderSpecified { get; private set; }
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
    TodoReminderDto? Reminder,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? WarningCode = null);
