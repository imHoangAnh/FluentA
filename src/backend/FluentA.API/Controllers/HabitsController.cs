using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/habits")]
public sealed class HabitsController : ControllerBase
{
    private readonly IHabitService _habits;

    public HabitsController(IHabitService habits)
    {
        _habits = habits;
    }

    /// <summary>Lists habits with learner-local summary data for the authenticated user.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? timeZoneId,
        [FromQuery] string? month,
        CancellationToken cancellationToken)
    {
        var result = await _habits.ListAsync(CurrentUserId(), timeZoneId, month, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<HabitDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a habit for the authenticated user.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateHabitRequest request, CancellationToken cancellationToken)
    {
        var result = await _habits.CreateAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<HabitDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates supplied habit fields for the authenticated user.</summary>
    [HttpPatch("{habitId:guid}")]
    public async Task<IActionResult> Update(Guid habitId, UpdateHabitRequest request, CancellationToken cancellationToken)
    {
        var result = await _habits.UpdateAsync(CurrentUserId(), habitId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<HabitDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an owned habit.</summary>
    [HttpDelete("{habitId:guid}")]
    public async Task<IActionResult> Delete(Guid habitId, CancellationToken cancellationToken)
    {
        var result = await _habits.DeleteAsync(CurrentUserId(), habitId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Lists completed entries for an owned habit and month.</summary>
    [HttpGet("{habitId:guid}/entries")]
    public async Task<IActionResult> ListEntries(
        Guid habitId,
        [FromQuery] string? month,
        [FromQuery] string? timeZoneId,
        CancellationToken cancellationToken)
    {
        var result = await _habits.ListEntriesAsync(CurrentUserId(), habitId, month, timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<HabitEntryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Toggles completion for one eligible owned habit date.</summary>
    [HttpPost("{habitId:guid}/entries")]
    public async Task<IActionResult> ToggleEntry(Guid habitId, ToggleHabitEntryRequest request, CancellationToken cancellationToken)
    {
        var result = await _habits.ToggleEntryAsync(CurrentUserId(), habitId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<HabitEntryToggleDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    private Guid CurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            throw new UnauthorizedAccessException("Missing authenticated user id.");
        }

        return id;
    }

    private IActionResult ToErrorResult<T>(OperationResult<T> result)
    {
        var error = result.Error switch
        {
            HabitError habitError => new ApiErrorEnvelope(habitError.Code, habitError.Message, habitError.Details),
            TrashError trashError => new ApiErrorEnvelope(trashError.Code, trashError.Message),
            _ => null,
        };
        var statusCode = result.Error switch
        {
            HabitError habitError => habitError.StatusCode,
            TrashError trashError => trashError.StatusCode,
            _ => 500,
        };
        if (error is null)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }
        return StatusCode(statusCode, ApiEnvelope<object>.Fail(error));
    }
}
