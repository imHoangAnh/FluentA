using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Domain.BoundedContexts.Review;

namespace FluentA.Application.UnitTests;

public sealed class ReviewServiceTests
{
    [Fact]
    public void ReviewMode_ContainsOnlyMeaningToWord()
    {
        var singleMode = Assert.Single(ReviewMode.All);
        Assert.Equal(ReviewMode.MeaningToWord, singleMode);
    }

    [Theory]
    [InlineData("  MITIGATE  ", true)]
    [InlineData("mitigate", true)]
    [InlineData("wrong", false)]
    [InlineData("", false)]
    public async Task SubmitTypedAnswerAsync_GradesMeaningToWordAnswers(string submittedAnswer, bool expectedCorrect)
    {
        var sessionId = Guid.NewGuid();
        var itemId = Guid.NewGuid();
        var wordId = Guid.NewGuid();
        var repository = new FakeReviewRepository
        {
            Target = new ReviewAnswerTargetDto(wordId, ReviewMode.MeaningToWord, "mitigate", "en"),
        };
        var service = new ReviewService(repository);

        var result = await service.SubmitTypedAnswerAsync(
            Guid.NewGuid(),
            sessionId,
            new SubmitReviewAnswerRequest(itemId, submittedAnswer, 6));

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Value);
        Assert.Equal(expectedCorrect, result.Value!.Correct);
        Assert.Equal(expectedCorrect, repository.LastSubmittedCorrect);
        Assert.Equal(submittedAnswer, repository.LastSubmittedAnswerText);
    }

    [Theory]
    [InlineData("dictation")]
    [InlineData("listenAndRepeat")]
    public async Task SubmitTypedAnswerAsync_RejectsRetiredReviewModes(string retiredMode)
    {
        var repository = new FakeReviewRepository
        {
            Target = new ReviewAnswerTargetDto(Guid.NewGuid(), retiredMode, "mitigate", "en"),
        };
        var service = new ReviewService(repository);

        var result = await service.SubmitTypedAnswerAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new SubmitReviewAnswerRequest(Guid.NewGuid(), "mitigate", 4));

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
        Assert.Equal("REVIEW_MODE_MISMATCH", result.Error!.Code);
        Assert.Null(repository.LastSubmittedCorrect);
    }

    private sealed class FakeReviewRepository : IReviewRepository
    {
        public ReviewAnswerTargetDto? Target { get; init; }
        public string? LastSubmittedAnswerText { get; private set; }
        public bool? LastSubmittedCorrect { get; private set; }

        public Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
            Guid userId,
            Guid pageId,
            Guid wordId,
            DateTime utcNow,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ReviewSessionDto> CreateReviewSessionAsync(
            Guid userId,
            DateTime utcNow,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ReviewDashboardDto> GetDashboardAsync(
            Guid userId,
            DateTime utcNow,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ReviewSessionDto?> GetSessionAsync(
            Guid userId,
            Guid sessionId,
            CancellationToken cancellationToken = default) =>
            throw new NotSupportedException();

        public Task<ReviewAnswerTargetDto?> GetAnswerTargetAsync(
            Guid userId,
            Guid sessionId,
            Guid itemId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Target);

        public Task<ReviewAnswerResultDto?> SubmitTypedAnswerAsync(
            Guid userId,
            Guid sessionId,
            Guid itemId,
            string answerText,
            bool correct,
            int timeSpentSeconds,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            LastSubmittedAnswerText = answerText;
            LastSubmittedCorrect = correct;

            return Task.FromResult<ReviewAnswerResultDto?>(new ReviewAnswerResultDto(
                itemId,
                Target!.WordId,
                correct,
                IsReviewed: true,
                Result: correct ? "correct" : "wrong",
                LevelBefore: 1,
                LevelAfter: correct ? 2 : 0,
                NextReviewDateBefore: new DateOnly(2026, 11, 24),
                NextReviewDateAfter: new DateOnly(2026, 11, correct ? 28 : 25),
                CompletedWords: 1,
                CurrentItemIndex: null,
                SessionStatus: "completed"));
        }
    }
}
