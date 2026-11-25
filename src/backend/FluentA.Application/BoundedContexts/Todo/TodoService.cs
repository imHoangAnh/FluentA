using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;

namespace FluentA.Application.BoundedContexts.Todo;

public sealed class TodoService : ITodoService
{
    private const string RecurrenceNextRetainedWarning = "recurrence-next-retained";
    private readonly ITodoRepository _repository;

    public TodoService(ITodoRepository repository)
    {
        _repository = repository;
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

        if (request.PriorityId is Guid priorityId)
        {
            var priority = await _repository.GetPriorityAsync(userId, priorityId, cancellationToken);
            if (priority is null)
            {
                return OperationResult<TodoItemDto>.Failure(TodoError.Validation(new Dictionary<string, string[]>
                {
                    ["priorityId"] = ["Selected priority does not exist."],
                }));
            }
        }

        var distinctTagIds = request.TagIds?.Distinct().ToList() ?? [];
        if (distinctTagIds.Count > 0)
        {
            var tags = await _repository.GetTagsByIdsAsync(userId, distinctTagIds, cancellationToken);
            if (tags.Count != distinctTagIds.Count)
            {
                return OperationResult<TodoItemDto>.Failure(TodoError.Validation(new Dictionary<string, string[]>
                {
                    ["tagIds"] = ["One or more selected tags do not exist."],
                }));
            }
        }

        var sortOrder = await _repository.NextSortOrderAsync(userId, validation.Date, cancellationToken);
        var item = TodoItem.Create(
            userId,
            request.Title,
            validation.Date,
            request.Note,
            request.IsImportant,
            validation.RepeatPattern,
            sortOrder,
            request.PriorityId,
            validation.ScheduledStartTime,
            validation.ScheduledEndTime,
            request.EstimatedMinutes);
        await _repository.AddAsync(item, cancellationToken);

        if (distinctTagIds.Count > 0)
        {
            await _repository.ReplaceItemTagsAsync(item.Id, distinctTagIds, cancellationToken);
        }

        var created = await _repository.GetAsync(userId, item.Id, cancellationToken) ?? item;
        return OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(created));
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
        var validation = TodoRequestValidator.ValidateUpdate(request);
        if (validation.Errors.Count > 0)
        {
            return OperationResult<TodoItemDto>.Failure(TodoError.Validation(validation.Errors));
        }

        if (request.IsPriorityIdSpecified && request.PriorityId is Guid requestedPriorityId)
        {
            var priority = await _repository.GetPriorityAsync(userId, requestedPriorityId, cancellationToken);
            if (priority is null)
            {
                return OperationResult<TodoItemDto>.Failure(TodoError.Validation(new Dictionary<string, string[]>
                {
                    ["priorityId"] = ["Selected priority does not exist."],
                }));
            }
        }

        List<Guid>? distinctTagIds = null;
        if (request.IsTagIdsSpecified)
        {
            distinctTagIds = request.TagIds?.Distinct().ToList() ?? [];
            if (distinctTagIds.Count > 0)
            {
                var tags = await _repository.GetTagsByIdsAsync(userId, distinctTagIds, cancellationToken);
                if (tags.Count != distinctTagIds.Count)
                {
                    return OperationResult<TodoItemDto>.Failure(TodoError.Validation(new Dictionary<string, string[]>
                    {
                        ["tagIds"] = ["One or more selected tags do not exist."],
                    }));
                }
            }
        }

        var scheduleChanged = request.IsScheduledStartTimeSpecified
            || request.IsScheduledEndTimeSpecified
            || request.IsEstimatedMinutesSpecified;
        var nextStart = request.IsScheduledStartTimeSpecified ? validation.ScheduledStartTime : item.ScheduledStartTime;
        var nextEnd = request.IsScheduledEndTimeSpecified
            ? validation.ScheduledEndTime
            : (request.IsScheduledStartTimeSpecified && validation.ScheduledStartTime is null ? null : item.ScheduledEndTime);
        var nextEstimated = request.IsEstimatedMinutesSpecified
            ? request.EstimatedMinutes
            : ((request.IsScheduledStartTimeSpecified || request.IsScheduledEndTimeSpecified)
                ? null
                : item.EstimatedMinutes);

        if (scheduleChanged)
        {
            var scheduleErrors = new Dictionary<string, string[]>();
            TodoRequestValidator.ValidateScheduleCoherence(nextStart, nextEnd, nextEstimated, scheduleErrors);
            if (scheduleErrors.Count > 0)
            {
                return OperationResult<TodoItemDto>.Failure(TodoError.Validation(scheduleErrors));
            }
        }

        var completionBefore = item.IsCompleted;
        var originalTitle = item.Title;
        var originalNote = item.Note;
        var originalImportant = item.IsImportant;
        var originalRepeat = item.RepeatPattern;
        var originalDate = item.Date;
        var originalSortOrder = item.SortOrder;
        var originalPriorityId = item.PriorityId;
        var originalStart = item.ScheduledStartTime;
        var originalEnd = item.ScheduledEndTime;
        var originalEstimated = item.EstimatedMinutes;
        var originalTagIds = item.TodoItemTags.Select(link => link.TagId).OrderBy(id => id).ToList();
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

        if (request.IsPriorityIdSpecified)
        {
            item.SetPriority(request.PriorityId);
        }

        if (scheduleChanged)
        {
            item.SetSchedule(nextStart, nextEnd, nextEstimated);
        }

        var tagsChanged = distinctTagIds is not null
            && !originalTagIds.SequenceEqual(distinctTagIds.OrderBy(id => id));

        if (request.Date is not null || request.SortOrder is not null)
        {
            var destinationDate = validation.Date ?? item.Date;
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
                originalSortOrder,
                originalPriorityId,
                originalStart,
                originalEnd,
                originalEstimated,
                tagsChanged);
            await _repository.UpdateRangeAsync(destination, cancellationToken);
        }
        else if (request.Title is not null
            || request.Note is not null
            || request.IsImportant is not null
            || request.IsRepeatPatternSpecified
            || request.IsPriorityIdSpecified
            || scheduleChanged
            || tagsChanged)
        {
            MarkGeneratedOccurrenceEditedWhenChanged(
                item,
                originalTitle,
                originalNote,
                originalImportant,
                originalRepeat,
                originalDate,
                originalSortOrder,
                originalPriorityId,
                originalStart,
                originalEnd,
                originalEstimated,
                tagsChanged);
            await _repository.UpdateAsync(item, cancellationToken);
        }

        if (distinctTagIds is not null)
        {
            await _repository.ReplaceItemTagsAsync(item.Id, distinctTagIds, cancellationToken);
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

        if (completionResult?.NextOccurrenceRetained == true)
        {
            warningCode = RecurrenceNextRetainedWarning;
        }

        var refreshed = await _repository.GetAsync(userId, item.Id, cancellationToken) ?? item;
        return OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(refreshed, warningCode));
    }

    public async Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
    {
        if (!await _repository.SoftDeleteFutureOccurrencesAsync(userId, todoId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(TodoError.NotFound());
        }
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
        var activePriorityId = source.Priority is { DeletedAt: not null } ? null : source.PriorityId;
        var duplicate = TodoItem.Create(
            userId,
            source.Title,
            source.Date,
            source.Note,
            source.IsImportant,
            source.RepeatPattern,
            sortOrder,
            activePriorityId,
            source.ScheduledStartTime,
            source.ScheduledEndTime,
            source.EstimatedMinutes);
        await _repository.AddAsync(duplicate, cancellationToken);

        var activeTagIds = source.TodoItemTags
            .Where(link => link.Tag is null || link.Tag.DeletedAt is null)
            .Select(link => link.TagId)
            .Distinct()
            .ToList();
        if (activeTagIds.Count > 0)
        {
            await _repository.ReplaceItemTagsAsync(duplicate.Id, activeTagIds, cancellationToken);
        }

        var copiedSubtasks = source.Subtasks
            .Where(subtask => subtask.DeletedAt is null)
            .OrderBy(subtask => subtask.SortOrder)
            .ThenBy(subtask => subtask.CreatedAt)
            .Select((subtask, index) => TodoSubtask.Create(duplicate.Id, subtask.Title, index, isCompleted: false))
            .ToList();
        if (copiedSubtasks.Count > 0)
        {
            await _repository.AddSubtasksAsync(copiedSubtasks, cancellationToken);
        }

        var refreshed = await _repository.GetAsync(userId, duplicate.Id, cancellationToken) ?? duplicate;
        return OperationResult<TodoItemDto>.Success(TodoDtoMapper.ToDto(refreshed));
    }

    public async Task<OperationResult<IReadOnlyList<TodoPriorityDto>>> ListPrioritiesAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var priorities = await _repository.ListPrioritiesAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<TodoPriorityDto>>.Success(priorities.Select(TodoDtoMapper.ToDto).ToList());
    }

    public async Task<OperationResult<TodoPriorityDto>> CreatePriorityAsync(
        Guid userId,
        CreateTodoPriorityRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = TodoRequestValidator.ValidatePriorityCreate(request);
        if (errors.Count > 0)
        {
            return OperationResult<TodoPriorityDto>.Failure(TodoError.Validation(errors));
        }

        var normalizedName = request.Name.Trim().ToLowerInvariant();
        if (await _repository.PriorityNameExistsAsync(userId, normalizedName, cancellationToken: cancellationToken))
        {
            return OperationResult<TodoPriorityDto>.Failure(
                TodoError.Conflict("TODO_PRIORITY_DUPLICATE", "A priority with this name already exists."));
        }

        var sortOrder = await _repository.NextPrioritySortOrderAsync(userId, cancellationToken);
        var priority = TodoPriority.Create(userId, request.Name, request.Tone, sortOrder);
        await _repository.AddPriorityAsync(priority, cancellationToken);
        return OperationResult<TodoPriorityDto>.Success(TodoDtoMapper.ToDto(priority));
    }

    public async Task<OperationResult<TodoPriorityDto>> UpdatePriorityAsync(
        Guid userId,
        Guid priorityId,
        UpdateTodoPriorityRequest request,
        CancellationToken cancellationToken = default)
    {
        var priority = await _repository.GetPriorityAsync(userId, priorityId, cancellationToken);
        if (priority is null)
        {
            return OperationResult<TodoPriorityDto>.Failure(
                TodoError.NotFound("TODO_PRIORITY_NOT_FOUND", "The requested priority could not be found."));
        }

        var errors = TodoRequestValidator.ValidatePriorityUpdate(request);
        if (errors.Count > 0)
        {
            return OperationResult<TodoPriorityDto>.Failure(TodoError.Validation(errors));
        }

        if (request.Name is not null)
        {
            var normalizedName = request.Name.Trim().ToLowerInvariant();
            if (await _repository.PriorityNameExistsAsync(userId, normalizedName, priorityId, cancellationToken))
            {
                return OperationResult<TodoPriorityDto>.Failure(
                    TodoError.Conflict("TODO_PRIORITY_DUPLICATE", "A priority with this name already exists."));
            }

            priority.Rename(request.Name);
        }

        if (request.Tone is not null)
        {
            priority.SetTone(request.Tone);
        }

        if (request.SortOrder is not null)
        {
            priority.SetSortOrder(request.SortOrder.Value);
        }

        await _repository.UpdatePriorityAsync(priority, cancellationToken);
        return OperationResult<TodoPriorityDto>.Success(TodoDtoMapper.ToDto(priority));
    }

    public async Task<OperationResult<bool>> DeletePriorityAsync(
        Guid userId,
        Guid priorityId,
        CancellationToken cancellationToken = default)
    {
        if (!await _repository.SoftDeletePriorityAsync(userId, priorityId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(
                TodoError.NotFound("TODO_PRIORITY_NOT_FOUND", "The requested priority could not be found."));
        }

        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<IReadOnlyList<TodoTagDto>>> ListTagsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var tags = await _repository.ListTagsAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<TodoTagDto>>.Success(tags.Select(TodoDtoMapper.ToDto).ToList());
    }

    public async Task<OperationResult<TodoTagDto>> CreateTagAsync(
        Guid userId,
        CreateTodoTagRequest request,
        CancellationToken cancellationToken = default)
    {
        var (errors, cleanedName) = TodoRequestValidator.ValidateTagCreate(request);
        if (errors.Count > 0)
        {
            return OperationResult<TodoTagDto>.Failure(TodoError.Validation(errors));
        }

        var normalizedName = cleanedName.ToLowerInvariant();
        if (await _repository.TagNameExistsAsync(userId, normalizedName, cancellationToken))
        {
            return OperationResult<TodoTagDto>.Failure(
                TodoError.Conflict("TODO_TAG_DUPLICATE", "A tag with this name already exists."));
        }

        var tag = TodoTag.Create(userId, cleanedName);
        await _repository.AddTagAsync(tag, cancellationToken);
        return OperationResult<TodoTagDto>.Success(TodoDtoMapper.ToDto(tag));
    }

    public async Task<OperationResult<bool>> DeleteTagAsync(
        Guid userId,
        Guid tagId,
        CancellationToken cancellationToken = default)
    {
        if (!await _repository.SoftDeleteTagAsync(userId, tagId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(
                TodoError.NotFound("TODO_TAG_NOT_FOUND", "The requested tag could not be found."));
        }

        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<TodoSubtaskDto>> CreateSubtaskAsync(
        Guid userId,
        Guid todoId,
        CreateTodoSubtaskRequest request,
        CancellationToken cancellationToken = default)
    {
        var parent = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (parent is null)
        {
            return OperationResult<TodoSubtaskDto>.Failure(TodoError.NotFound());
        }

        var errors = TodoRequestValidator.ValidateSubtaskCreate(request);
        if (errors.Count > 0)
        {
            return OperationResult<TodoSubtaskDto>.Failure(TodoError.Validation(errors));
        }

        var sortOrder = await _repository.NextSubtaskSortOrderAsync(todoId, cancellationToken);
        var subtask = TodoSubtask.Create(todoId, request.Title, sortOrder);
        await _repository.AddSubtaskAsync(subtask, cancellationToken);

        if (parent.IsGeneratedOccurrencePristine)
        {
            parent.MarkGeneratedOccurrenceEdited();
            await _repository.UpdateAsync(parent, cancellationToken);
        }

        return OperationResult<TodoSubtaskDto>.Success(TodoDtoMapper.ToDto(subtask));
    }

    public async Task<OperationResult<TodoSubtaskDto>> UpdateSubtaskAsync(
        Guid userId,
        Guid todoId,
        Guid subtaskId,
        UpdateTodoSubtaskRequest request,
        CancellationToken cancellationToken = default)
    {
        var parent = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (parent is null)
        {
            return OperationResult<TodoSubtaskDto>.Failure(TodoError.NotFound());
        }

        var subtask = await _repository.GetSubtaskAsync(userId, todoId, subtaskId, cancellationToken);
        if (subtask is null)
        {
            return OperationResult<TodoSubtaskDto>.Failure(
                TodoError.NotFound("TODO_SUBTASK_NOT_FOUND", "The requested subtask could not be found."));
        }

        var errors = TodoRequestValidator.ValidateSubtaskUpdate(request);
        if (errors.Count > 0)
        {
            return OperationResult<TodoSubtaskDto>.Failure(TodoError.Validation(errors));
        }

        if (request.Title is not null)
        {
            subtask.Rename(request.Title);
        }

        if (request.IsCompleted is not null)
        {
            subtask.SetCompleted(request.IsCompleted.Value);
        }

        if (request.SortOrder is not null)
        {
            subtask.SetSortOrder(request.SortOrder.Value);
        }

        await _repository.UpdateSubtaskAsync(subtask, cancellationToken);

        if (parent.IsGeneratedOccurrencePristine)
        {
            parent.MarkGeneratedOccurrenceEdited();
            await _repository.UpdateAsync(parent, cancellationToken);
        }

        return OperationResult<TodoSubtaskDto>.Success(TodoDtoMapper.ToDto(subtask));
    }

    public async Task<OperationResult<bool>> DeleteSubtaskAsync(
        Guid userId,
        Guid todoId,
        Guid subtaskId,
        CancellationToken cancellationToken = default)
    {
        var parent = await _repository.GetAsync(userId, todoId, cancellationToken);
        if (parent is null)
        {
            return OperationResult<bool>.Failure(TodoError.NotFound());
        }

        if (!await _repository.SoftDeleteSubtaskAsync(userId, todoId, subtaskId, DateTime.UtcNow, cancellationToken))
        {
            return OperationResult<bool>.Failure(
                TodoError.NotFound("TODO_SUBTASK_NOT_FOUND", "The requested subtask could not be found."));
        }

        if (parent.IsGeneratedOccurrencePristine)
        {
            parent.MarkGeneratedOccurrenceEdited();
            await _repository.UpdateAsync(parent, cancellationToken);
        }

        return OperationResult<bool>.Success(true);
    }

    private static void MarkGeneratedOccurrenceEditedWhenChanged(
        TodoItem item,
        string originalTitle,
        string? originalNote,
        bool originalImportant,
        TodoRepeatPattern? originalRepeat,
        DateTime originalDate,
        int originalSortOrder,
        Guid? originalPriorityId,
        TimeOnly? originalStart,
        TimeOnly? originalEnd,
        int? originalEstimated,
        bool tagsChanged)
    {
        if (item.Title != originalTitle
            || item.Note != originalNote
            || item.IsImportant != originalImportant
            || item.RepeatPattern != originalRepeat
            || item.Date != originalDate
            || item.SortOrder != originalSortOrder
            || item.PriorityId != originalPriorityId
            || item.ScheduledStartTime != originalStart
            || item.ScheduledEndTime != originalEnd
            || item.EstimatedMinutes != originalEstimated
            || tagsChanged)
        {
            item.MarkGeneratedOccurrenceEdited();
        }
    }
}
