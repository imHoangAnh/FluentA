using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;

namespace FluentA.Application.BoundedContexts.Todo;

internal static class TodoRequestValidator
{
    private const string DateFormat = "yyyy-MM-dd";
    private static readonly string[] TimeFormats = ["HH:mm", "H:mm"];

    public static (
        Dictionary<string, string[]> Errors,
        DateTime Date,
        TodoRepeatPattern? RepeatPattern,
        TimeOnly? ScheduledStartTime,
        TimeOnly? ScheduledEndTime) ValidateCreate(CreateTodoItemRequest request)
    {
        var errors = ValidateTitleAndNote(request.Title, request.Note);
        if (!TryParseDate(request.Date, "date", out var date, out var dateErrors))
        {
            errors["date"] = dateErrors["date"];
        }

        var repeatPattern = ParseRepeatPattern(request.RepeatPattern, "repeatPattern", errors);
        var startTime = ParseOptionalTime(request.ScheduledStartTime, "scheduledStartTime", errors);
        var endTime = ParseOptionalTime(request.ScheduledEndTime, "scheduledEndTime", errors);

        ValidateScheduleCoherence(startTime, endTime, request.EstimatedMinutes, errors);

        return (errors, date, repeatPattern, startTime, endTime);
    }

    public static (
        Dictionary<string, string[]> Errors,
        DateTime? Date,
        TodoRepeatPattern? RepeatPattern,
        TimeOnly? ScheduledStartTime,
        TimeOnly? ScheduledEndTime) ValidateUpdate(UpdateTodoItemRequest request)
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

        var startTime = request.IsScheduledStartTimeSpecified
            ? ParseOptionalTime(request.ScheduledStartTime, "scheduledStartTime", errors)
            : null;

        var endTime = request.IsScheduledEndTimeSpecified
            ? ParseOptionalTime(request.ScheduledEndTime, "scheduledEndTime", errors)
            : null;

        if (request.IsEstimatedMinutesSpecified && request.EstimatedMinutes is < 0 or > 1440)
        {
            errors["estimatedMinutes"] = ["estimatedMinutes must be between 0 and 1440."];
        }

        return (errors, parsedDate, repeatPattern, startTime, endTime);
    }

    public static void ValidateScheduleCoherence(
        TimeOnly? startTime,
        TimeOnly? endTime,
        int? estimatedMinutes,
        Dictionary<string, string[]> errors)
    {
        if (endTime.HasValue && !startTime.HasValue)
        {
            errors["scheduledEndTime"] = ["scheduledEndTime requires scheduledStartTime."];
        }
        else if (startTime.HasValue && endTime.HasValue && endTime.Value <= startTime.Value)
        {
            errors["scheduledEndTime"] = ["scheduledEndTime must be after scheduledStartTime."];
        }

        if (estimatedMinutes is < 0 or > 1440)
        {
            errors["estimatedMinutes"] = ["estimatedMinutes must be between 0 and 1440."];
        }
    }

    public static Dictionary<string, string[]> ValidatePriorityCreate(CreateTodoPriorityRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        ValidatePriorityName(request.Name, errors);
        if (request.Tone is not null)
        {
            ValidatePriorityTone(request.Tone, errors);
        }

        return errors;
    }

    public static Dictionary<string, string[]> ValidatePriorityUpdate(UpdateTodoPriorityRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Name is not null)
        {
            ValidatePriorityName(request.Name, errors);
        }

        if (request.Tone is not null)
        {
            ValidatePriorityTone(request.Tone, errors);
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["sortOrder cannot be negative."];
        }

        return errors;
    }

    public static (Dictionary<string, string[]> Errors, string CleanedName) ValidateTagCreate(CreateTodoTagRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        var cleaned = request.Name.Trim().TrimStart('#').Trim();
        if (cleaned.Length is < 1 or > 32)
        {
            errors["name"] = ["Tag name must be between 1 and 32 characters."];
        }

        return (errors, cleaned);
    }

    public static Dictionary<string, string[]> ValidateSubtaskCreate(CreateTodoSubtaskRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Subtask title is required."];
        }
        else if (request.Title.Trim().Length > 240)
        {
            errors["title"] = ["Subtask title must be at most 240 characters."];
        }

        return errors;
    }

    public static Dictionary<string, string[]> ValidateSubtaskUpdate(UpdateTodoSubtaskRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Title is not null && string.IsNullOrWhiteSpace(request.Title))
        {
            errors["title"] = ["Subtask title is required."];
        }
        else if (request.Title?.Trim().Length > 240)
        {
            errors["title"] = ["Subtask title must be at most 240 characters."];
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["sortOrder cannot be negative."];
        }

        return errors;
    }

    private static void ValidatePriorityName(string name, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            errors["name"] = ["Priority name is required."];
        }
        else if (name.Trim().Length > 40)
        {
            errors["name"] = ["Priority name must be at most 40 characters."];
        }
    }

    private static void ValidatePriorityTone(string tone, Dictionary<string, string[]> errors)
    {
        var normalized = tone.Trim().ToLowerInvariant();
        if (!TodoPriority.AllowedTones.Contains(normalized, StringComparer.Ordinal))
        {
            errors["tone"] = ["tone must be neutral, primary, warning, or destructive."];
        }
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

    private static TimeOnly? ParseOptionalTime(string? value, string field, Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (!TimeOnly.TryParseExact(value.Trim(), TimeFormats, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
        {
            errors[field] = [$"{field} must be in HH:mm format."];
            return null;
        }

        return parsed;
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
