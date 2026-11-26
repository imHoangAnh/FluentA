using FluentA.Application.BoundedContexts.Practice.DTOs;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IReviewEnrollmentPort
{
    Task<AddPracticeWordsToReviewDto?> StagePracticeWordEnrollmentAsync(
        Guid userId, Guid pageId, Guid wordId, TimeZoneInfo timeZone, DateTime utcNow,
        int initialLevel, CancellationToken cancellationToken = default) =>
        throw new NotSupportedException("Review enrollment must support staging inside the Practice transaction.");

    // Keep the original contract for callers compiled against the level-zero
    // enrollment path. New callers can use the overload below to seed a card
    // at a selected SRS level.
    Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default) =>
        EnrollMissingPracticeWordsAsync(userId, pageId, wordId, timeZone, utcNow, cancellationToken);
}
