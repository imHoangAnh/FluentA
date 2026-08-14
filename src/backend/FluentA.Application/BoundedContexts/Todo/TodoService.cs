using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.BoundedContexts.Trash;
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
    private readonly ITrashService? _trashService;

    public TodoService(ITodoRepository repository, ITodoSyncNotifier? syncNotifier = null, ITrashService? trashService = null)
    {
        _repository = repository;
        _syncNotifier = syncNotifier ?? NullTodoSyncNotifier.Instance;
        _trashService = trashService;
    }

    public async Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByDateAsync(
        Guid userId,
        string date,
        CancellationToken cancellationToken = default)
    {
        if (!TodoRequestValidator.TryParseDate(date, "date", out var parsedDate, out var errors))
        {
            return OperationResult<IReadOnlyList<TodoItemDto>>.Failure(TodoError.Validation(errors));
        }

        var items = await _repository.ListByDateAsync(userId, parsedDate, cancellationToken);
        return OperationResult<IReadOnlyList<TodoItemDto>>.Success(items.Select(item => TodoDtoMapper.ToDto(item)).ToList());
    }

    public async Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByRangeAsync(
        Guid userId,
        string startDate,
        string endDate,
        CancellationToken cancellationToken = default)
    {
        var validation = new Dictionary<string, string[]>();
        if (!TodoRequestValidator.TryParseDate(startDate, "startDate", out var parsedStart, out var startErrors))
        {
            validation["startDate"] = startErrors["startDate"];
        }

        if (!TodoRequestValidator.TryParseDate(endDate, "endDate", out var parsedEnd, out var endErrors))
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
        return OperationResult<IReadOnlyList<TodoItemDto>>.Success(items.Select(item => TodoDtoMapper.ToDto(item)).ToList());
    }

    public async Task<OperationResult<TodoItemDto>> GetAsync(
        Guid userId,
        Guid todoId,
        CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetAsync(userId, todoId, cancellationToken);
        return item is null
            ? OperationResult<TodoItemDto>.Failure(TodoError.NotFound())
            : OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(item));
    }

    public async Task<OperationResult<TodoItemDto>> CreateAsync(
        Guid userId,
        CreateTodoItemRequest request,
        CancellationToken cancellationToken = default)
    {
        var validation = TodoRequestValidator.ValidateCreate(request);
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
        return OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(item));
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
        var validation = TodoRequestValidator.ValidateUpdate(request, item.Date, item.IsCompleted, nowUtc);
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

        return OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(item, warningCode));
    }

    public async Task<OperationResult<TrashEntryDto>> DeleteAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
    {
        if (_trashService is not null)
        {
            return await _trashService.TrashTodoAsync(userId, todoId, cancellationToken);
        }

        var item = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (item is null)
        {
            return OperationResult<TrashEntryDto>.Failure(TodoError.NotFound());
        }

        item.SoftDelete();
        await _repository.UpdateAsync(item, cancellationToken);
        return OperationResult<TrashEntryDto>.Success(new TrashEntryDto(
            Guid.Empty,
            "Todo",
            item.Id,
            item.Title,
            TodoDtoMapper.FormatDate(item.Date),
            item.DeletedAt!.Value,
            item.DeletedAt!.Value.AddDays(30)));
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
        return OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(duplicate));
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

}
