using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.BoundedContexts.Review;

public sealed class ReviewService : IReviewService, IReviewEnrollmentPort
{
    private readonly IReviewRepository _repository;

    public ReviewService(IReviewRepository repository)
    {
        _repository = repository;
    }

    public Task<AddPracticeWordsToReviewDto?> EnrollMissingPracticeWordsAsync(
        Guid userId,
        Guid deckId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        return _repository.AddPracticeWordsToReviewAsync(userId, deckId, timeZone, utcNow, cancellationToken);
    }

    public async Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.BoardId == Guid.Empty)
        {
            errors["boardId"] = ["Board id is required."];
        }

        if (!IsAllowedOrderType(request.OrderType))
        {
            errors["orderType"] = ["Order type must be sequential or shuffle."];
        }

        if (!IsAllowedReviewMode(request.Mode))
        {
            errors["mode"] = ["Mode must be dictation, pronunciation, meaningToWord, or random."];
        }

        if (!ReviewTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<ReviewSessionCreatedDto>.Failure(ReviewError.Validation(errors));
        }

        var session = await _repository.CreateReviewSessionAsync(
            userId,
            request.BoardId,
            request.OrderType,
            request.Mode,
            timeZone!,
            DateTime.UtcNow,
            Guid.NewGuid(),
            cancellationToken);

        return session is null
            ? OperationResult<ReviewSessionCreatedDto>.Failure(ReviewError.DeckOrCardNotFound())
            : OperationResult<ReviewSessionCreatedDto>.Success(session);
    }

    public async Task<OperationResult<ReviewSessionSummaryDto>> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        if (sessionId == Guid.Empty)
        {
            return OperationResult<ReviewSessionSummaryDto>.Failure(ReviewError.Validation(new Dictionary<string, string[]>
            {
                ["sessionId"] = ["Session id is required."]
            }));
        }

        var summary = await _repository.GetReviewSessionSummaryAsync(userId, sessionId, cancellationToken);
        return summary is null
            ? OperationResult<ReviewSessionSummaryDto>.Failure(ReviewError.DeckOrCardNotFound())
            : OperationResult<ReviewSessionSummaryDto>.Success(summary);
    }

    public Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _repository.GetReviewSettingsAsync(userId, cancellationToken);

    public async Task<OperationResult<ReviewSettingsDto>> UpdateReviewSettingsAsync(
        Guid userId,
        UpdateReviewSettingsRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = ValidateSettings(request);
        if (errors.Count > 0)
        {
            return OperationResult<ReviewSettingsDto>.Failure(ReviewError.Validation(errors));
        }

        return OperationResult<ReviewSettingsDto>.Success(await _repository.UpdateReviewSettingsAsync(
            userId,
            request.DailyLimit,
            request.RecapAfterAnswer,
            cancellationToken));
    }

    public async Task<OperationResult<FlashcardDashboardDto>> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        string? timeZoneId,
        CancellationToken cancellationToken = default)
    {
        if (!ReviewTime.TryFindTimeZone(timeZoneId, out var timeZone))
        {
            return OperationResult<FlashcardDashboardDto>.Failure(ReviewError.Validation(new Dictionary<string, string[]>
            {
                ["timeZoneId"] = ["A valid browser timezone id is required."]
            }));
        }

        var dashboard = await _repository.GetDashboardAsync(userId, boardId, timeZone!, DateTime.UtcNow, cancellationToken);
        return dashboard is null
            ? OperationResult<FlashcardDashboardDto>.Failure(ReviewError.DeckOrCardNotFound())
            : OperationResult<FlashcardDashboardDto>.Success(dashboard);
    }

    public async Task<OperationResult<ReviewResultDto>> SubmitReviewAsync(
        Guid userId,
        SubmitReviewRequest request,
        CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.SessionId == Guid.Empty)
        {
            errors["sessionId"] = ["Session id is required."];
        }

        if (request.WordId == Guid.Empty)
        {
            errors["wordId"] = ["Word id is required."];
        }

        if (request.TimeSpentSeconds is < 0 or > 86400)
        {
            errors["timeSpentSeconds"] = ["Time spent must be between 0 and 86400 seconds."];
        }

        if (!ReviewTime.TryFindTimeZone(request.TimeZoneId, out var timeZone))
        {
            errors["timeZoneId"] = ["A valid browser timezone id is required."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<ReviewResultDto>.Failure(ReviewError.Validation(errors));
        }

        var result = await _repository.AddReviewAsync(
            userId,
            request.SessionId,
            request.WordId,
            request.Correct,
            request.TimeSpentSeconds,
            timeZone!,
            cancellationToken);

        if (result is null)
        {
            return OperationResult<ReviewResultDto>.Failure(ReviewError.DeckOrCardNotFound());
        }

        return OperationResult<ReviewResultDto>.Success(result);
    }

    private static Dictionary<string, string[]> ValidateSettings(UpdateReviewSettingsRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.DailyLimit is < 1 or > ReviewSettings.MaximumDailyLimit)
        {
            errors["dailyLimit"] = [$"Daily limit must be between 1 and {ReviewSettings.MaximumDailyLimit}."];
        }

        return errors;
    }

    private static bool IsAllowedOrderType(string? value) =>
        value is "sequential" or "shuffle";

    private static bool IsAllowedReviewMode(string? value) =>
        value is "dictation" or "pronunciation" or "meaningToWord" or "random";
}
