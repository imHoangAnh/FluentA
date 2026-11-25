using FluentA.Application.BoundedContexts.Analytics.DTOs;

namespace FluentA.Application.BoundedContexts.Analytics;

public interface IAnalyticsRepository
{
    Task<LearningAnalyticsSourceData> GetLearningAnalyticsSourceAsync(
        Guid userId,
        CancellationToken cancellationToken = default);
}
