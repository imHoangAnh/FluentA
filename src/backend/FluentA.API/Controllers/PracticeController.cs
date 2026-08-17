using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/practice")]
public sealed class PracticeController : ApiControllerBase
{
    private readonly IPracticeService _practice;

    public PracticeController(IPracticeService practice)
    {
        _practice = practice;
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreatePracticeSessionSummary(CreatePracticeSessionSummaryRequest request, CancellationToken cancellationToken)
    {
        var result = await _practice.CreatePracticeSessionSummaryAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeSessionSummaryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("add-to-review")]
    public async Task<IActionResult> AddPracticeWordsToReview(AddPracticeWordsToReviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _practice.AddPracticeWordsToReviewAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<AddPracticeWordsToReviewDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetPracticeSettings(CancellationToken cancellationToken)
    {
        var settings = await _practice.GetPracticeSettingsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<PracticeSettingsDto>.Ok(settings));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdatePracticeSettings(UpdatePracticeSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await _practice.UpdatePracticeSettingsAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeSettingsDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

}
