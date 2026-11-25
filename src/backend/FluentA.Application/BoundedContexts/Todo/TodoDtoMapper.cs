using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Application.BoundedContexts.Todo;

internal static class TodoDtoMapper
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string TimeFormat = "HH:mm";

    public static TodoItemDto ToDto(TodoItem item, string? warningCode = null)
    {
        var activePriority = item.Priority is { DeletedAt: null } priority
            ? ToDto(priority)
            : null;
        var priorityId = activePriority?.Id ?? (item.Priority is null ? item.PriorityId : null);

        var tags = item.TodoItemTags
            .Where(link => link.Tag is not null && link.Tag.DeletedAt is null)
            .Select(link => ToDto(link.Tag!))
            .OrderBy(tag => tag.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var subtasks = item.Subtasks
            .Where(subtask => subtask.DeletedAt is null)
            .OrderBy(subtask => subtask.SortOrder)
            .ThenBy(subtask => subtask.CreatedAt)
            .Select(ToDto)
            .ToList();

        return new TodoItemDto(
            item.Id,
            item.Title,
            item.Note,
            FormatDate(item.Date),
            item.SortOrder,
            item.IsCompleted,
            item.IsImportant,
            item.RepeatPattern?.ToString(),
            item.CompletedAt,
            item.CreatedAt,
            item.UpdatedAt,
            warningCode,
            priorityId,
            activePriority,
            FormatTime(item.ScheduledStartTime),
            FormatTime(item.ScheduledEndTime),
            item.EstimatedMinutes,
            tags,
            subtasks);
    }

    public static TodoPriorityDto ToDto(TodoPriority priority)
    {
        return new TodoPriorityDto(
            priority.Id,
            priority.Name,
            priority.Tone,
            priority.SortOrder);
    }

    public static TodoTagDto ToDto(TodoTag tag)
    {
        return new TodoTagDto(tag.Id, tag.Name);
    }

    public static TodoSubtaskDto ToDto(TodoSubtask subtask)
    {
        return new TodoSubtaskDto(
            subtask.Id,
            subtask.Title,
            subtask.IsCompleted,
            subtask.SortOrder);
    }

    public static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }

    public static string? FormatTime(TimeOnly? time)
    {
        return time?.ToString(TimeFormat, CultureInfo.InvariantCulture);
    }
}
