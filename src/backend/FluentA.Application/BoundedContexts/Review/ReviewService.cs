using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Review;

namespace FluentA.Application.BoundedContexts.Review;

public sealed class ReviewService : IReviewService, IReviewEnrollmentPort
{
    private readonly IReviewRepository _repository;

    public Task<AddPracticeWordsToReviewDto?> StagePracticeWordEnrollmentAsync(
        Guid userId, Guid pageId, Guid wordId, DateTime utcNow,
        int initialLevel, CancellationToken cancellationToken = default) =>
        _repository.StagePracticeWordEnrollmentAsync(userId, pageId, wordId, utcNow, initialLevel, cancellationToken);

    public ReviewService(IReviewRepository repository)
    {
        _repository = repository;
    }

    public Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        CancellationToken cancellationToken = default) =>
        _repository.AddPracticeWordsToReviewAsync(userId, pageId, wordId, utcNow, cancellationToken);

    public Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default) =>
        _repository.AddPracticeWordsToReviewAsync(
            userId,
            pageId,
            wordId,
            utcNow,
            initialLevel,
            cancellationToken);

    public async Task<OperationResult<ReviewSessionDto>> CreateReviewSessionAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.CreateReviewSessionAsync(
            userId,
            DateTime.UtcNow,
            cancellationToken);
        return OperationResult<ReviewSessionDto>.Success(session);
    }

    public async Task<OperationResult<ReviewDashboardDto>> GetDashboardAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var dashboard = await _repository.GetDashboardAsync(
            userId,
            DateTime.UtcNow,
            cancellationToken);
        return OperationResult<ReviewDashboardDto>.Success(dashboard);
    }

    public async Task<OperationResult<ReviewSessionDto>> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        if (sessionId == Guid.Empty)
        {
            return OperationResult<ReviewSessionDto>.Failure(ReviewError.Validation(new Dictionary<string, string[]>
            {
                ["sessionId"] = ["Session id is required."],
            }));
        }

        var session = await _repository.GetSessionAsync(userId, sessionId, cancellationToken);
        return session is null
            ? OperationResult<ReviewSessionDto>.Failure(ReviewError.SessionNotFound())
            : OperationResult<ReviewSessionDto>.Success(session);
    }

    public async Task<OperationResult<ReviewAnswerResultDto>> SubmitTypedAnswerAsync(
        Guid userId,
        Guid sessionId,
        SubmitReviewAnswerRequest request,
        CancellationToken cancellationToken = default)
    {
        var answerText = request.AnswerText ?? string.Empty;
        var errors = ValidateAnswerRequest(sessionId, request.ItemId, request.TimeSpentSeconds);
        if (answerText.Length > 4000)
        {
            errors["answerText"] = ["Answer must be at most 4000 characters."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<ReviewAnswerResultDto>.Failure(ReviewError.Validation(errors));
        }

        var target = await _repository.GetAnswerTargetAsync(userId, sessionId, request.ItemId, cancellationToken);
        if (target is null)
        {
            return OperationResult<ReviewAnswerResultDto>.Failure(ReviewError.ItemNotFound());
        }

        if (target.Mode != ReviewMode.MeaningToWord)
        {
            return OperationResult<ReviewAnswerResultDto>.Failure(ReviewError.InvalidMode());
        }

        var correct = string.Equals(
            answerText.Trim(),
            target.ExpectedAnswer,
            StringComparison.OrdinalIgnoreCase);
        var result = await _repository.SubmitTypedAnswerAsync(
            userId,
            sessionId,
            request.ItemId,
            answerText,
            correct,
            request.TimeSpentSeconds,
            DateTime.UtcNow,
            cancellationToken);

        return result is null
            ? OperationResult<ReviewAnswerResultDto>.Failure(ReviewError.ItemNotFound())
            : OperationResult<ReviewAnswerResultDto>.Success(result);
    }

    private static Dictionary<string, string[]> ValidateAnswerRequest(
        Guid sessionId,
        Guid itemId,
        int timeSpentSeconds)
    {
        var errors = new Dictionary<string, string[]>();
        if (sessionId == Guid.Empty)
        {
            errors["sessionId"] = ["Session id is required."];
        }

        if (itemId == Guid.Empty)
        {
            errors["itemId"] = ["Item id is required."];
        }

        if (timeSpentSeconds is < 0 or > 86400)
        {
            errors["timeSpentSeconds"] = ["Time spent must be between 0 and 86400 seconds."];
        }

        return errors;
    }
}
