using FluentA.Application.BoundedContexts.Practice.DTOs;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IReviewEnrollmentPort
{
    Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid deckId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
}
