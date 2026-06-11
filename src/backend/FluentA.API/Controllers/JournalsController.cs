using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/journals")]
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
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Journal entry deleted." }))
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
        if (result.Error is not JournalError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
