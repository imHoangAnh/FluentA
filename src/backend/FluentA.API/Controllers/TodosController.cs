using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.BoundedContexts.Trash;
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
            ? Ok(ApiEnvelope<TodoItemDto>.Ok(result.Value!))
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
            ? Ok(ApiEnvelope<IReadOnlyList<TodoItemDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a todo item for the authenticated user.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateTodoItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.CreateAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates supplied fields on an owned todo item.</summary>
    [HttpPatch("{todoId:guid}")]
    public async Task<IActionResult> Update(Guid todoId, UpdateTodoItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _todos.UpdateAsync(CurrentUserId(), todoId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates one incomplete same-day copy of an owned todo item.</summary>
    [HttpPost("{todoId:guid}/duplicate")]
    public async Task<IActionResult> Duplicate(Guid todoId, CancellationToken cancellationToken)
    {
        var result = await _todos.DuplicateAsync(CurrentUserId(), todoId, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<TodoItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an owned todo item and its already-created future occurrences to Trash.</summary>
    [HttpDelete("{todoId:guid}")]
    public async Task<IActionResult> Delete(Guid todoId, CancellationToken cancellationToken)
    {
        var result = await _todos.DeleteAsync(CurrentUserId(), todoId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

}
