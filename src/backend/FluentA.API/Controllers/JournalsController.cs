using System.Security.Claims;
using FluentA.API.Common;
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
public sealed class JournalsController : ApiControllerBase
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

}
