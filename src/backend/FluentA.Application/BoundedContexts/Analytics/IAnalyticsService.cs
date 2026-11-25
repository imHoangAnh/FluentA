using FluentA.Application.BoundedContexts.Analytics.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Analytics;

public interface IAnalyticsService
{
    Task<OperationResult<LearningAnalyticsDto>> GetLearningAnalyticsAsync(
        Guid userId,
        string? range,
        CancellationToken cancellationToken = default);
}
