using FluentA.Application.BoundedContexts.Practice.DTOs;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IReviewEnrollmentPort
{
    Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
}
