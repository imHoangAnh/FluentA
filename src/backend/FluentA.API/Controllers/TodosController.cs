using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/todos")]
public sealed class TodosController : ApiControllerBase
{
    private readonly ITodoService _todos;

    public TodosController(ITodoService todos)
    {
        _todos = todos;
    }

    /// <summary>Gets one active todo item owned by the authenticated user.</summary>
    [HttpGet("{todoId:guid}")]
    public async Task<IActionResult> Get(Guid todoId, CancellationToken cancellationToken)
    {
        var result = await _todos.GetAsync(CurrentUserId(), todoId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Lists todo items by date or inclusive date range for the authenticated user.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? date,
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        CancellationToken cancellationToken)
    {
        OperationResult<IReadOnlyList<TodoItemDto>> result;
        if (!string.IsNullOrWhiteSpace(startDate) || !string.IsNullOrWhiteSpace(endDate))
        {
            result = await _todos.ListByRangeAsync(CurrentUserId(), startDate ?? string.Empty, endDate ?? string.Empty, cancellationToken);
        }
        else
        {
            result = await _todos.ListByDateAsync(CurrentUserId(), date ?? DateTime.UtcNow.ToString("yyyy-MM-dd"), cancellationToken);
        }

        return result.IsSuccess
            ? Ok(ApiResponse<IReadOnlyList<TodoItemDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a todo item for the authenticated user.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateTodoItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.CreateAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates supplied fields on an owned todo item.</summary>
    [HttpPatch("{todoId:guid}")]
    public async Task<IActionResult> Update(Guid todoId, UpdateTodoItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.UpdateAsync(CurrentUserId(), todoId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates one incomplete same-day copy of an owned todo item.</summary>
    [HttpPost("{todoId:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid todoId, CancellationToken cancellationToken)
    {
        var result = await _todos.DuplicateAsync(CurrentUserId(), todoId, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Hides an owned todo and its already-created future occurrences.</summary>
    [HttpDelete("{todoId:guid}")]
    public async Task<IActionResult> Delete(Guid todoId, CancellationToken cancellationToken)
    {
        var result = await _todos.DeleteAsync(CurrentUserId(), todoId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = true }))
            : ToErrorResult(result);
    }

    /// <summary>Lists custom todo priorities owned by the authenticated user.</summary>
    [HttpGet("priorities")]
    public async Task<IActionResult> ListPriorities(CancellationToken cancellationToken)
    {
        var result = await _todos.ListPrioritiesAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<IReadOnlyList<TodoPriorityDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a custom todo priority for the authenticated user.</summary>
    [HttpPost("priorities")]
    public async Task<IActionResult> CreatePriority(CreateTodoPriorityRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.CreatePriorityAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<TodoPriorityDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates a custom todo priority owned by the authenticated user.</summary>
    [HttpPatch("priorities/{priorityId:guid}")]
    public async Task<IActionResult> UpdatePriority(Guid priorityId, UpdateTodoPriorityRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.UpdatePriorityAsync(CurrentUserId(), priorityId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<TodoPriorityDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes a custom todo priority owned by the authenticated user.</summary>
    [HttpDelete("priorities/{priorityId:guid}")]
    public async Task<IActionResult> DeletePriority(Guid priorityId, CancellationToken cancellationToken)
    {
        var result = await _todos.DeletePriorityAsync(CurrentUserId(), priorityId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = true }))
            : ToErrorResult(result);
    }

    /// <summary>Lists manual todo tags owned by the authenticated user.</summary>
    [HttpGet("tags")]
    public async Task<IActionResult> ListTags(CancellationToken cancellationToken)
    {
        var result = await _todos.ListTagsAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<IReadOnlyList<TodoTagDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a manual todo tag for the authenticated user.</summary>
    [HttpPost("tags")]
    public async Task<IActionResult> CreateTag(CreateTodoTagRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.CreateTagAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<TodoTagDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes a manual todo tag owned by the authenticated user.</summary>
    [HttpDelete("tags/{tagId:guid}")]
    public async Task<IActionResult> DeleteTag(Guid tagId, CancellationToken cancellationToken)
    {
        var result = await _todos.DeleteTagAsync(CurrentUserId(), tagId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = true }))
            : ToErrorResult(result);
    }

    /// <summary>Creates a subtask under an owned todo item.</summary>
    [HttpPost("{todoId:guid}/subtasks")]
    public async Task<IActionResult> CreateSubtask(Guid todoId, CreateTodoSubtaskRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.CreateSubtaskAsync(CurrentUserId(), todoId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<TodoSubtaskDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates a subtask under an owned todo item.</summary>
    [HttpPatch("{todoId:guid}/subtasks/{subtaskId:guid}")]
    public async Task<IActionResult> UpdateSubtask(Guid todoId, Guid subtaskId, UpdateTodoSubtaskRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.UpdateSubtaskAsync(CurrentUserId(), todoId, subtaskId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<TodoSubtaskDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes a subtask under an owned todo item.</summary>
    [HttpDelete("{todoId:guid}/subtasks/{subtaskId:guid}")]
    public async Task<IActionResult> DeleteSubtask(Guid todoId, Guid subtaskId, CancellationToken cancellationToken)
    {
        var result = await _todos.DeleteSubtaskAsync(CurrentUserId(), todoId, subtaskId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = true }))
            : ToErrorResult(result);
    }
}
