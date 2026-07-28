using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;
using FluentA.Application.BoundedContexts.Trash;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/journal")]
public sealed class JournalsController : ControllerBase
{
    private readonly IJournalService _journals;

    public JournalsController(IJournalService journals)
    {
        _journals = journals;
    }

    /// <summary>Lists active journal entries for the authenticated user.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _journals.ListAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<JournalEntrySummaryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Searches active owned journal entry titles.</summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery(Name = "q")] string? query, CancellationToken cancellationToken)
    {
        var result = await _journals.SearchAsync(CurrentUserId(), query, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<JournalSearchResultDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets writing dates that have active owned journal entries in a month.</summary>
    [HttpGet("calendar")]
    public async Task<IActionResult> Calendar([FromQuery] string? month, CancellationToken cancellationToken)
    {
        var result = await _journals.CalendarAsync(CurrentUserId(), month, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<JournalCalendarDayDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets one active owned journal entry.</summary>
    [HttpGet("{journalId:guid}")]
    public async Task<IActionResult> Get(Guid journalId, CancellationToken cancellationToken)
    {
        var result = await _journals.GetAsync(CurrentUserId(), journalId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<JournalEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a journal entry for the authenticated user.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateJournalEntryRequest request, CancellationToken cancellationToken)
    {
        var result = await _journals.CreateAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<JournalEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates supplied fields on an active owned journal entry.</summary>
    [HttpPatch("{journalId:guid}")]
    public async Task<IActionResult> Update(Guid journalId, UpdateJournalEntryRequest request, CancellationToken cancellationToken)
    {
        var result = await _journals.UpdateAsync(CurrentUserId(), journalId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<JournalEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an active owned journal entry.</summary>
    [HttpDelete("{journalId:guid}")]
    public async Task<IActionResult> Delete(Guid journalId, CancellationToken cancellationToken)
    {
        var result = await _journals.DeleteAsync(CurrentUserId(), journalId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
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
            JournalError journalError => new ApiErrorEnvelope(journalError.Code, journalError.Message, journalError.Details),
            TrashError trashError => new ApiErrorEnvelope(trashError.Code, trashError.Message),
            _ => null,
        };
        var statusCode = result.Error switch
        {
            JournalError journalError => journalError.StatusCode,
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
