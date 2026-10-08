using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Application.BoundedContexts.Todo;

internal static class TodoDtoMapper
{
    private const string DateFormat = "yyyy-MM-dd";
    public static TodoItemDto ToDto(TodoItem item, string? warningCode = null)
    {
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
            warningCode);
    }

    public static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }

}
