using System.Globalization;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Application.BoundedContexts.Todo;

public sealed class TodoService : ITodoService
{
    private const string DateFormat = "yyyy-MM-dd";
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
        return OperationResult<IReadOnlyList<TodoItemDto>>.Success(items.Select(ToDto).ToList());
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
        return OperationResult<IReadOnlyList<TodoItemDto>>.Success(items.Select(ToDto).ToList());
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
        var item = TodoItem.Create(userId, request.Title, validation.Date, request.Note, request.IsImportant, sortOrder);
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
        if (validation.Count > 0)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.Validation(validation));
        }

        var completionBefore = item.IsCompleted;
        if (request.Title is not null)
        {
            item.Rename(request.Title);
        }

        if (request.Note is not null)
        {
            item.UpdateNote(request.Note);
        }

        if (request.IsCompleted is not null)
        {
            item.SetCompleted(request.IsCompleted.Value, DateTime.UtcNow);
        }

        if (request.IsImportant is not null)
        {
            item.SetImportant(request.IsImportant.Value);
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

            await _repository.UpdateRangeAsync(destination, cancellationToken);
        }
        else
        {
            await _repository.UpdateAsync(item, cancellationToken);
        }
        if (completionBefore != item.IsCompleted)
        {
            await _syncNotifier.TodoItemCheckedAsync(userId, item.Id, item.IsCompleted, cancellationToken);
        }

        return OperationResult<TodoItemDto>.Success(ToDto(item));
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

    private static (Dictionary<string, string[]> Errors, DateTime Date) ValidateCreate(CreateTodoItemRequest request)
    {
        var errors = ValidateTitleAndNote(request.Title, request.Note);
        if (!TryParseDate(request.Date, "date", out var date, out var dateErrors))
        {
            errors["date"] = dateErrors["date"];
        }

        return (errors, date);
    }

    private static Dictionary<string, string[]> ValidateUpdate(UpdateTodoItemRequest request)
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

        return errors;
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

    private static TodoItemDto ToDto(TodoItem item)
    {
        return new TodoItemDto(
            item.Id,
            item.Title,
            item.Note,
            FormatDate(item.Date),
            item.SortOrder,
            item.IsCompleted,
            item.IsImportant,
            item.CompletedAt,
            item.CreatedAt,
            item.UpdatedAt);
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
