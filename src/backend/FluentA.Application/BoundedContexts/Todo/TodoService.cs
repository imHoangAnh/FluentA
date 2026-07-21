using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;

namespace FluentA.Application.BoundedContexts.Todo;

public sealed class TodoService : ITodoService
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string RecurrenceNextRetainedWarning = "recurrence-next-retained";
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

        var validation = ValidateUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.Validation(validation.Errors));
        }

        var completionBefore = item.IsCompleted;
        var originalTitle = item.Title;
        var originalNote = item.Note;
        var originalImportant = item.IsImportant;
        var originalRepeat = item.RepeatPattern;
        var originalDate = item.Date;
        var originalSortOrder = item.SortOrder;
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

        if (request.Date is not null || request.SortOrder is not null)
        {
            var destinationDate = request.Date is null ? item.Date : ParseDate(request.Date);
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
                originalDate,
                originalSortOrder);
            await _repository.UpdateRangeAsync(destination, cancellationToken);
        }
        else if (request.Title is not null
            || request.Note is not null
            || request.IsImportant is not null
            || request.IsRepeatPatternSpecified)
        {
            MarkGeneratedOccurrenceEditedWhenChanged(
                item,
                originalTitle,
                originalNote,
                originalImportant,
                originalRepeat,
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
                DateTime.UtcNow,
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

        return OperationResult<TodoItemDto>.Success(ToDto(
            item,
            completionResult?.NextOccurrenceRetained == true ? RecurrenceNextRetainedWarning : null));
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

    private static (Dictionary<string, string[]> Errors, DateTime Date, TodoRepeatPattern? RepeatPattern) ValidateCreate(CreateTodoItemRequest request)
    {
        var errors = ValidateTitleAndNote(request.Title, request.Note);
        if (!TryParseDate(request.Date, "date", out var date, out var dateErrors))
        {
            errors["date"] = dateErrors["date"];
        }

        var repeatPattern = ParseRepeatPattern(request.RepeatPattern, "repeatPattern", errors);

        return (errors, date, repeatPattern);
    }

    private static (Dictionary<string, string[]> Errors, TodoRepeatPattern? RepeatPattern) ValidateUpdate(UpdateTodoItemRequest request)
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

        if (request.Date is not null && !TryParseDate(request.Date, "date", out _, out var dateErrors))
        {
            errors["date"] = dateErrors["date"];
        }

        if (request.SortOrder is < 0)
        {
            errors["sortOrder"] = ["sortOrder cannot be negative."];
        }

        var repeatPattern = request.IsRepeatPatternSpecified
            ? ParseRepeatPattern(request.RepeatPattern, "repeatPattern", errors)
            : null;

        return (errors, repeatPattern);
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
        DateTime originalDate,
        int originalSortOrder)
    {
        if (item.Title != originalTitle
            || item.Note != originalNote
            || item.IsImportant != originalImportant
            || item.RepeatPattern != originalRepeat
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
            item.CompletedAt,
            item.CreatedAt,
            item.UpdatedAt,
            warningCode);
    }

    private static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }

    private static DateTime ParseDate(string value)
    {
        TryParseDate(value, "date", out var parsed, out _);
        return parsed;
    }
}
