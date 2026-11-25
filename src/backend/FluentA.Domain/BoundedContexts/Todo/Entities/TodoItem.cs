using FluentA.Domain.SeedWork;
using FluentA.Domain.BoundedContexts.Todo.Enums;

namespace FluentA.Domain.BoundedContexts.Todo.Entities;

public sealed class TodoItem : BaseEntity, IAggregateRoot
{
    private readonly List<TodoSubtask> _subtasks = [];
    private readonly List<TodoItemTag> _todoItemTags = [];

    private TodoItem()
    {
        Title = string.Empty;
    }

    private TodoItem(
        Guid userId,
        string title,
        DateTime date,
        string? note,
        bool isImportant,
        TodoRepeatPattern? repeatPattern,
        int sortOrder,
        Guid? generatedFromTodoId,
        bool isGeneratedOccurrencePristine,
        Guid? priorityId = null,
        TimeOnly? scheduledStartTime = null,
        TimeOnly? scheduledEndTime = null,
        int? estimatedMinutes = null)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Title = CleanTitle(title);
        Date = NormalizeDate(date);
        Note = CleanNote(note);
        IsImportant = isImportant;
        RepeatPattern = repeatPattern;
        SortOrder = ValidateSortOrder(sortOrder);
        GeneratedFromTodoId = generatedFromTodoId;
        IsGeneratedOccurrencePristine = isGeneratedOccurrencePristine;
        PriorityId = priorityId;
        SetScheduleValues(scheduledStartTime, scheduledEndTime, estimatedMinutes);
    }

    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string? Note { get; private set; }
    public DateTime Date { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsCompleted { get; private set; }
    public bool IsImportant { get; private set; }
    public TodoRepeatPattern? RepeatPattern { get; private set; }
    public Guid? GeneratedFromTodoId { get; private set; }
    public bool IsGeneratedOccurrencePristine { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public Guid? PriorityId { get; private set; }
    public TodoPriority? Priority { get; private set; }
    public TimeOnly? ScheduledStartTime { get; private set; }
    public TimeOnly? ScheduledEndTime { get; private set; }
    public int? EstimatedMinutes { get; private set; }
    public IReadOnlyCollection<TodoSubtask> Subtasks => _subtasks;
    public IReadOnlyCollection<TodoItemTag> TodoItemTags => _todoItemTags;

    public static TodoItem Create(
        Guid userId,
        string title,
        DateTime date,
        string? note,
        bool isImportant = false,
        TodoRepeatPattern? repeatPattern = null,
        int sortOrder = 0,
        Guid? priorityId = null,
        TimeOnly? scheduledStartTime = null,
        TimeOnly? scheduledEndTime = null,
        int? estimatedMinutes = null)
    {
        return new TodoItem(
            userId,
            title,
            date,
            note,
            isImportant,
            repeatPattern,
            sortOrder,
            null,
            false,
            priorityId,
            scheduledStartTime,
            scheduledEndTime,
            estimatedMinutes);
    }

    public static TodoItem CreateGeneratedOccurrence(TodoItem source, DateTime date, int sortOrder)
    {
        ArgumentNullException.ThrowIfNull(source);
        if (source.RepeatPattern is null)
        {
            throw new InvalidOperationException("A Todo without a repeat pattern cannot generate an occurrence.");
        }

        return new TodoItem(
            source.UserId,
            source.Title,
            date,
            source.Note,
            source.IsImportant,
            source.RepeatPattern,
            sortOrder,
            source.Id,
            true,
            source.PriorityId,
            source.ScheduledStartTime,
            source.ScheduledEndTime,
            source.EstimatedMinutes);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        Touch();
    }

    public void UpdateNote(string? note)
    {
        Note = CleanNote(note);
        Touch();
    }

    public void SetCompleted(bool isCompleted, DateTime nowUtc)
    {
        if (IsCompleted == isCompleted)
        {
            return;
        }

        IsCompleted = isCompleted;
        CompletedAt = isCompleted ? nowUtc : null;
        Touch(nowUtc);
    }

    public void SetImportant(bool isImportant)
    {
        if (IsImportant == isImportant)
        {
            return;
        }

        IsImportant = isImportant;
        Touch();
    }

    public void SetRepeatPattern(TodoRepeatPattern? repeatPattern)
    {
        if (RepeatPattern == repeatPattern)
        {
            return;
        }

        RepeatPattern = repeatPattern;
        Touch();
    }

    public void SetPriority(Guid? priorityId)
    {
        if (PriorityId == priorityId)
        {
            return;
        }

        PriorityId = priorityId;
        Priority = null;
        Touch();
    }

    public void SetSchedule(TimeOnly? startTime, TimeOnly? endTime, int? estimatedMinutes)
    {
        var previousStart = ScheduledStartTime;
        var previousEnd = ScheduledEndTime;
        var previousEstimated = EstimatedMinutes;
        SetScheduleValues(startTime, endTime, estimatedMinutes);
        if (ScheduledStartTime != previousStart
            || ScheduledEndTime != previousEnd
            || EstimatedMinutes != previousEstimated)
        {
            Touch();
        }
    }

    public void MarkGeneratedOccurrenceEdited()
    {
        if (GeneratedFromTodoId is null || !IsGeneratedOccurrencePristine)
        {
            return;
        }

        IsGeneratedOccurrencePristine = false;
        Touch();
    }

    public void MoveTo(DateTime date, int sortOrder)
    {
        Date = NormalizeDate(date);
        SortOrder = ValidateSortOrder(sortOrder);
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        if (DeletedAt.HasValue)
        {
            return;
        }

        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;
    }

    private void SetScheduleValues(TimeOnly? startTime, TimeOnly? endTime, int? estimatedMinutes)
    {
        if (endTime.HasValue && !startTime.HasValue)
        {
            throw new ArgumentException("Scheduled end time requires a start time.", nameof(endTime));
        }

        if (startTime.HasValue && endTime.HasValue && endTime.Value <= startTime.Value)
        {
            throw new ArgumentException("Scheduled end time must be after start time.", nameof(endTime));
        }

        if (estimatedMinutes is < 0 or > 1440)
        {
            throw new ArgumentOutOfRangeException(nameof(estimatedMinutes), "Estimated minutes must be between 0 and 1440.");
        }

        ScheduledStartTime = startTime;
        ScheduledEndTime = endTime;
        EstimatedMinutes = estimatedMinutes ?? (startTime.HasValue && endTime.HasValue
            ? (int)(endTime.Value - startTime.Value).TotalMinutes
            : null);
    }

    private void Touch(DateTime? nowUtc = null)
    {
        UpdatedAt = nowUtc ?? DateTime.UtcNow;
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }

    private static string CleanTitle(string title)
    {
        var cleaned = title.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Todo title must be between 1 and 240 characters.", nameof(title));
        }

        return cleaned;
    }

    private static string? CleanNote(string? note)
    {
        if (string.IsNullOrWhiteSpace(note))
        {
            return null;
        }

        var cleaned = note.Trim();
        if (cleaned.Length > 4000)
        {
            throw new ArgumentException("Todo note must be at most 4000 characters.", nameof(note));
        }

        return cleaned;
    }

    private static int ValidateSortOrder(int sortOrder)
    {
        if (sortOrder < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sortOrder), "Todo sort order cannot be negative.");
        }

        return sortOrder;
    }
}
