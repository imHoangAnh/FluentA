using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Enums;

namespace FluentA.Application.BoundedContexts.Todo;

internal static class TodoRequestValidator
{
    private const string DateFormat = "yyyy-MM-dd";
    public static (
        Dictionary<string, string[]> Errors,
        DateTime Date,
        TodoRepeatPattern? RepeatPattern) ValidateCreate(CreateTodoItemRequest request)
    {
        var errors = ValidateTitleAndNote(request.Title, request.Note);
        if (!TryParseDate(request.Date, "date", out var date, out var dateErrors))
        {
            errors["date"] = dateErrors["date"];
        }

        var repeatPattern = ParseRepeatPattern(request.RepeatPattern, "repeatPattern", errors);
        return (errors, date, repeatPattern);
    }

    public static (
        Dictionary<string, string[]> Errors,
        DateTime? Date,
        TodoRepeatPattern? RepeatPattern) ValidateUpdate(UpdateTodoItemRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Title is not null && string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Title is required."];
        }
        else if (request.Title?.Trim().Length > 240)
        {
            errors["title"] = ["Title must be at most 240 characters."];
        }

        if (request.Note is not null && request.Note.Trim().Length > 4000)
        {
            errors["note"] = ["Note must be at most 4000 characters."];
        }

        DateTime? parsedDate = null;
        if (request.Date is not null)
        {
            if (!TryParseDate(request.Date, "date", out var candidateDate, out var dateErrors))
            {
                errors["date"] = dateErrors["date"];
            }
            else
            {
                parsedDate = candidateDate;
            }
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["sortOrder cannot be negative."];
        }

        var repeatPattern = request.IsRepeatPatternSpecified
            ? ParseRepeatPattern(request.RepeatPattern, "repeatPattern", errors)
            : null;
        return (errors, parsedDate, repeatPattern);
    }

    private static Dictionary<string, string[]> ValidateTitleAndNote(string title, string? note)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(title))
        {
            errors["title"] = ["Title is required."];
        }
        else if (title.Trim().Length > 240)
        {
            errors["title"] = ["Title must be at most 240 characters."];
        }

        if (note is not null && note.Trim().Length > 4000)
        {
            errors["note"] = ["Note must be at most 4000 characters."];
        }

        return errors;
    }

    public static bool TryParseDate(string? value, string field, out DateTime date, out Dictionary<string, string[]> errors)
    {
        errors = [];
        if (!DateTime.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            date = default;
            errors[field] = [$"{field} must be a date in YYYY-MM-DD format."];
            return false;
        }

        date = DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc);
        return true;
    }

    private static TodoRepeatPattern? ParseRepeatPattern(
        string? value,
        string field,
        Dictionary<string, string[]> errors)
    {
        if (value is null)
        {
            return null;
        }

        if (!Enum.TryParse<TodoRepeatPattern>(value, ignoreCase: false, out var parsed)
            || !Enum.IsDefined(parsed)
            || !string.Equals(value, parsed.ToString(), StringComparison.Ordinal))
        {
            errors[field] = ["repeatPattern must be Daily, Weekdays, Weekly, Monthly, Yearly, or null."];
            return null;
        }

        return parsed;
    }
}
