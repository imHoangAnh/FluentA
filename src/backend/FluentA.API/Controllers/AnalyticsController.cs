using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Analytics;
using FluentA.Application.BoundedContexts.Analytics.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/analytics")]
public sealed class AnalyticsController : ApiControllerBase
{
    private readonly IAnalyticsService _analytics;

    public AnalyticsController(IAnalyticsService analytics)
    {
        _analytics = analytics;
    }

    [HttpGet]
    public async Task<IActionResult> GetLearningAnalytics(
        [FromQuery] string? range,
        CancellationToken cancellationToken)
    {
        var result = await _analytics.GetLearningAnalyticsAsync(CurrentUserId(), range, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<LearningAnalyticsDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }
}
