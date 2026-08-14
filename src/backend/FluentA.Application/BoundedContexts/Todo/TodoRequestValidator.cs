using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;
using FluentA.Domain.BoundedContexts.Todo.Services;

namespace FluentA.Application.BoundedContexts.Todo;

internal static class TodoRequestValidator
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string TimeFormat = "HH:mm";
    public static (
        Dictionary<string, string[]> Errors,
        DateTime Date,
        TodoRepeatPattern? RepeatPattern,
        ValidatedReminder? Reminder) ValidateCreate(CreateTodoItemRequest request)
    {
        var errors = ValidateTitleAndNote(request.Title, request.Note);
        if (!TryParseDate(request.Date, "date", out var date, out var dateErrors))
        {
            errors["date"] = dateErrors["date"];
        }

        var repeatPattern = ParseRepeatPattern(request.RepeatPattern, "repeatPattern", errors);
        var reminder = errors.ContainsKey("date")
            ? null
            : ValidateReminder(request.Reminder, date, DateTime.UtcNow, errors);

        return (errors, date, repeatPattern, reminder);
    }

    public static (
        Dictionary<string, string[]> Errors,
        DateTime? Date,
        TodoRepeatPattern? RepeatPattern,
        ValidatedReminder? Reminder) ValidateUpdate(
            UpdateTodoItemRequest request,
            DateTime currentDate,
            bool currentIsCompleted,
            DateTime nowUtc)
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
        var reminder = request.IsReminderSpecified && !errors.ContainsKey("date")
            ? ValidateReminder(request.Reminder, parsedDate ?? currentDate, nowUtc, errors)
            : null;
        if (request.IsReminderSpecified
            && request.Reminder is not null
            && (request.IsCompleted ?? currentIsCompleted))
        {
            errors["reminder"] = ["Reopen the task before setting a reminder."];
            reminder = null;
        }

        return (errors, parsedDate, repeatPattern, reminder);
    }

    private static ValidatedReminder? ValidateReminder(
        TodoReminderRequest? request,
        DateTime taskDate,
        DateTime nowUtc,
        Dictionary<string, string[]> errors)
    {
        if (request is null)
        {
            return null;
        }

        if (!TimeOnly.TryParseExact(request.Time, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var time))
        {
            errors["reminder.time"] = ["Reminder time must use HH:mm format."];
        }

        TimeZoneInfo? timeZone = null;
        var timeZoneId = request.TimeZoneId?.Trim() ?? string.Empty;
        if (timeZoneId.Length is < 1 or > 100)
        {
            errors["reminder.timeZoneId"] = ["Reminder timezone id is required and must be at most 100 characters."];
        }
        else
        {
            try
            {
                timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                errors["reminder.timeZoneId"] = ["Reminder timezone id is not supported."];
            }
            catch (InvalidTimeZoneException)
            {
                errors["reminder.timeZoneId"] = ["Reminder timezone id is not supported."];
            }
        }

        if (request.ScheduledAtUtc.Kind != DateTimeKind.Utc)
        {
            errors["reminder.scheduledAtUtc"] = ["Reminder scheduled instant must be UTC."];
        }
        else if (request.ScheduledAtUtc <= nowUtc)
        {
            errors["reminder.scheduledAtUtc"] = ["Reminder must be scheduled in the future."];
        }
        else if (!errors.ContainsKey("reminder.time")
            && timeZone is not null
            && !TodoReminderSchedule.Matches(taskDate, time, request.ScheduledAtUtc, timeZone))
        {
            errors["reminder.scheduledAtUtc"] = ["Reminder date, time, timezone, and UTC instant do not match."];
        }

        return errors.Keys.Any(key => key.StartsWith("reminder.", StringComparison.Ordinal))
            ? null
            : new ValidatedReminder(time, timeZoneId, request.ScheduledAtUtc);
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
    internal sealed record ValidatedReminder(TimeOnly Time, string TimeZoneId, DateTime ScheduledAtUtc);
}
