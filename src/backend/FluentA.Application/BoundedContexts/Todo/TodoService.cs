using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;
using FluentA.Domain.BoundedContexts.Todo.Services;

namespace FluentA.Application.BoundedContexts.Todo;

public sealed class TodoService : ITodoService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string RecurrenceNextRetainedWarning = "recurrence-next-retained";
    private const string ReminderClearedAfterDateChangeWarning = "reminder-cleared-after-date-change";
    private const string TimeFormat = "HH:mm";
    private readonly ITodoRepository _repository;
    private readonly ITodoSyncNotifier _syncNotifier;

    public TodoService(ITodoRepository repository, ITodoSyncNotifier? syncNotifier = null)
    {
        _repository = repository;
        _syncNotifier = syncNotifier ?? NullTodoSyncNotifier.Instance;
    }

    public async Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByDateAsync(
        Guid userId,
        string date,
        CancellationToken cancellationToken = default)
    {
        if (!TryParseDate(date, "date", out var parsedDate, out var errors))
        {
            return OperationResult<IReadOnlyList<TodoItemDto>>.Failure(TodoError.Validation(errors));
        }

        var items = await _repository.ListByDateAsync(userId, parsedDate, cancellationToken);
        return OperationResult<IReadOnlyList<TodoItemDto>>.Success(items.Select(item => ToDto(item)).ToList());
    }

    public async Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByRangeAsync(
        Guid userId,
        string startDate,
        string endDate,
        CancellationToken cancellationToken = default)
    {
        var validation = new Dictionary<string, string[]>();
        if (!TryParseDate(startDate, "startDate", out var parsedStart, out var startErrors))
        {
            validation["startDate"] = startErrors["startDate"];
        }

        if (!TryParseDate(endDate, "endDate", out var parsedEnd, out var endErrors))
        {
            validation["endDate"] = endErrors["endDate"];
        }

        if (validation.Count == 0 && parsedStart > parsedEnd)
        {
            validation["startDate"] = ["Start date must be on or before end date."];
        }

        if (validation.Count > 0)
        {
            return OperationResult<IReadOnlyList<TodoItemDto>>.Failure(TodoError.Validation(validation));
        }

        var items = await _repository.ListByRangeAsync(userId, parsedStart, parsedEnd, cancellationToken);
        return OperationResult<IReadOnlyList<TodoItemDto>>.Success(items.Select(item => ToDto(item)).ToList());
    }

    public async Task<OperationResult<TodoItemDto>> GetAsync(
        Guid userId,
        Guid todoId,
        CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetAsync(userId, todoId, cancellationToken);
        return item is null
            ? OperationResult<TodoItemDto>.Failure(TodoError.NotFound())
            : OperationResult<TodoItemDto>.Success(ToDto(item));
    }

    public async Task<OperationResult<TodoItemDto>> CreateAsync(
        Guid userId,
        CreateTodoItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = ValidateCreate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.Validation(validation.Errors));
        }

        var sortOrder = await _repository.NextSortOrderAsync(userId, validation.Date, cancellationToken);
        var item = TodoItem.Create(
            userId,
            request.Title,
            validation.Date,
            request.Note,
            request.IsImportant,
            validation.RepeatPattern,
            validation.Reminder?.Time,
            validation.Reminder?.TimeZoneId,
            validation.Reminder?.ScheduledAtUtc,
            sortOrder);
        await _repository.AddAsync(item, cancellationToken);
        return OperationResult<TodoItemDto>.Success(ToDto(item));
    }

    public async Task<OperationResult<TodoItemDto>> UpdateAsync(
        Guid userId,
        Guid todoId,
        UpdateTodoItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (item is null)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.NotFound());
        }

        var nowUtc = DateTime.UtcNow;
        var validation = ValidateUpdate(request, item.Date, item.IsCompleted, nowUtc);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.Validation(validation.Errors));
        }

        var completionBefore = item.IsCompleted;
        var originalTitle = item.Title;
        var originalNote = item.Note;
        var originalImportant = item.IsImportant;
        var originalRepeat = item.RepeatPattern;
        var originalReminderTime = item.ReminderTime;
        var originalReminderTimeZoneId = item.ReminderTimeZoneId;
        var originalReminderScheduledAtUtc = item.ReminderScheduledAtUtc;
        var originalReminderSentAtUtc = item.ReminderSentAtUtc;
        var originalDate = item.Date;
        var originalSortOrder = item.SortOrder;
        string? warningCode = null;
        if (request.Title is not null)
        {
            item.Rename(request.Title);
        }

        if (request.Note is not null)
        {
            item.UpdateNote(request.Note);
        }

        if (request.IsImportant is not null)
        {
            item.SetImportant(request.IsImportant.Value);
        }

        if (request.IsRepeatPatternSpecified)
        {
            item.SetRepeatPattern(validation.RepeatPattern);
        }

        if (request.IsReminderSpecified)
        {
            if (validation.Reminder is null)
            {
                item.ClearReminder();
            }
            else
            {
                item.SetReminder(
                    validation.Reminder.Time,
                    validation.Reminder.TimeZoneId,
                    validation.Reminder.ScheduledAtUtc);
            }
        }

        if (request.Date is not null || request.SortOrder is not null)
        {
            var destinationDate = validation.Date ?? item.Date;
            if (request.Date is not null
                && !request.IsReminderSpecified
                && item.ReminderTime is not null
                && item.ReminderTimeZoneId is not null)
            {
                var timeZone = TimeZoneInfo.FindSystemTimeZoneById(item.ReminderTimeZoneId);
                var scheduledAtUtc = TodoReminderSchedule.ResolveUtc(destinationDate, item.ReminderTime.Value, timeZone);
                if (scheduledAtUtc <= nowUtc)
                {
                    item.ClearReminder();
                    warningCode = ReminderClearedAfterDateChangeWarning;
                }
                else
                {
                    item.SetReminder(item.ReminderTime.Value, item.ReminderTimeZoneId, scheduledAtUtc);
                }
            }

            if ((request.IsCompleted ?? item.IsCompleted) && item.ReminderSentAtUtc is null)
            {
                item.CancelUnsentReminder();
            }

            var destination = (await _repository.ListByDateAsync(userId, destinationDate, cancellationToken))
                .Where(candidate => candidate.Id != item.Id)
                .OrderBy(candidate => candidate.IsCompleted)
                .ThenBy(candidate => candidate.SortOrder)
                .ToList();
            var targetIndex = Math.Clamp(request.SortOrder ?? destination.Count, 0, destination.Count);
            destination.Insert(targetIndex, item);

            foreach (var (candidate, index) in destination.Select((candidate, index) => (candidate, index)))
            {
                candidate.MoveTo(destinationDate, index);
            }

            MarkGeneratedOccurrenceEditedWhenChanged(
                item,
                originalTitle,
                originalNote,
                originalImportant,
                originalRepeat,
                originalReminderTime,
                originalReminderTimeZoneId,
                originalReminderScheduledAtUtc,
                originalReminderSentAtUtc,
                originalDate,
                originalSortOrder);
            await _repository.UpdateRangeAsync(destination, cancellationToken);
        }
        else if (request.Title is not null
            || request.Note is not null
            || request.IsImportant is not null
            || request.IsRepeatPatternSpecified
            || request.IsReminderSpecified)
        {
            MarkGeneratedOccurrenceEditedWhenChanged(
                item,
                originalTitle,
                originalNote,
                originalImportant,
                originalRepeat,
                originalReminderTime,
                originalReminderTimeZoneId,
                originalReminderScheduledAtUtc,
                originalReminderSentAtUtc,
                originalDate,
                originalSortOrder);
            await _repository.UpdateAsync(item, cancellationToken);
        }

        TodoCompletionMutationResult? completionResult = null;
        if (request.IsCompleted is not null && completionBefore != request.IsCompleted.Value)
        {
            completionResult = await _repository.SetCompletionAsync(
                userId,
                todoId,
                request.IsCompleted.Value,
                nowUtc,
                cancellationToken);
            if (completionResult is null)
            {
                return OperationResult<TodoItemDto>.Failure(TodoError.NotFound());
            }

            item = completionResult.Item;
        }

        if (completionBefore != item.IsCompleted)
        {
            await _syncNotifier.TodoItemCheckedAsync(userId, item.Id, item.IsCompleted, cancellationToken);
        }

        if (completionResult?.NextOccurrenceRetained == true)
        {
            warningCode = RecurrenceNextRetainedWarning;
        }

        return OperationResult<TodoItemDto>.Success(ToDto(item, warningCode));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (item is null)
        {
            return OperationResult<bool>.Failure(TodoError.NotFound());
        }

        item.SoftDelete();
        await _repository.UpdateAsync(item, cancellationToken);
        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<TodoItemDto>> DuplicateAsync(
        Guid userId,
        Guid todoId,
        CancellationToken cancellationToken = default)
    {
        var source = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (source is null)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.NotFound());
        }

        var sortOrder = await _repository.NextSortOrderAsync(userId, source.Date, cancellationToken);
        var duplicate = TodoItem.Create(
            userId,
            source.Title,
            source.Date,
            source.Note,
            source.IsImportant,
            source.RepeatPattern,
            source.ReminderTime,
            source.ReminderTimeZoneId,
            source.ReminderScheduledAtUtc,
            sortOrder);
        await _repository.AddAsync(duplicate, cancellationToken);
        return OperationResult<TodoItemDto>.Success(ToDto(duplicate));
    }

    private static (
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

    private static (
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

    private static bool TryParseDate(string? value, string field, out DateTime date, out Dictionary<string, string[]> errors)
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

    private static void MarkGeneratedOccurrenceEditedWhenChanged(
        TodoItem item,
        string originalTitle,
        string? originalNote,
        bool originalImportant,
        TodoRepeatPattern? originalRepeat,
        TimeOnly? originalReminderTime,
        string? originalReminderTimeZoneId,
        DateTime? originalReminderScheduledAtUtc,
        DateTime? originalReminderSentAtUtc,
        DateTime originalDate,
        int originalSortOrder)
    {
        if (item.Title != originalTitle
            || item.Note != originalNote
            || item.IsImportant != originalImportant
            || item.RepeatPattern != originalRepeat
            || item.ReminderTime != originalReminderTime
            || item.ReminderTimeZoneId != originalReminderTimeZoneId
            || item.ReminderScheduledAtUtc != originalReminderScheduledAtUtc
            || item.ReminderSentAtUtc != originalReminderSentAtUtc
            || item.Date != originalDate
            || item.SortOrder != originalSortOrder)
        {
            item.MarkGeneratedOccurrenceEdited();
        }
    }

    private static TodoItemDto ToDto(TodoItem item, string? warningCode = null)
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
            item.ReminderTime is not null
                && item.ReminderTimeZoneId is not null
                && item.ReminderScheduledAtUtc is not null
                ? new TodoReminderDto(
                    item.ReminderTime.Value.ToString(TimeFormat, CultureInfo.InvariantCulture),
                    item.ReminderTimeZoneId,
                    item.ReminderScheduledAtUtc.Value,
                    item.ReminderSentAtUtc)
                : null,
            item.CompletedAt,
            item.CreatedAt,
            item.UpdatedAt,
            warningCode);
    }

    private static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }

    private sealed record ValidatedReminder(TimeOnly Time, string TimeZoneId, DateTime ScheduledAtUtc);
}
