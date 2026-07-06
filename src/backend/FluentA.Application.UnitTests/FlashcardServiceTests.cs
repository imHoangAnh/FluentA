using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.UnitTests;

public sealed class FlashcardServiceTests
{
    [Fact]
    public async Task ListDecks_UsesAuthenticatedUserScope()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);
        var userId = Guid.NewGuid();

        var decks = await service.ListDecksAsync(userId);

        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Single(decks);
        Assert.Single(decks[0].Cards);
        Assert.Equal("zh", decks[0].BoardLanguage);
    }

    [Fact]
    public async Task SubmitReview_ValidatesUsesAuthenticatedUserScope()
    {
        var repository = new RecordingReviewRepository();
        var service = CreateReviewService(repository);
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var wordId = Guid.NewGuid();

        var result = await service.SubmitReviewAsync(userId, new SubmitReviewRequest(sessionId, wordId, true, 8, "Asia/Ho_Chi_Minh"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(sessionId, repository.RequestedSessionId);
        Assert.Equal(wordId, repository.RequestedWordId);
        Assert.True(repository.RequestedCorrect);
        Assert.Equal(8, repository.RequestedTimeSpentSeconds);
        Assert.Equal("Asia/Ho_Chi_Minh", repository.RequestedTimeZone?.Id);
    }

    [Fact]
    public async Task CreateReviewSession_ValidatesBoardAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingReviewRepository();
        var service = CreateReviewService(repository);
        var userId = Guid.NewGuid();
        var boardId = Guid.NewGuid();

        var invalid = await service.CreateReviewSessionAsync(userId, new CreateReviewSessionRequest(Guid.Empty, "sequential", "dictation", "UTC"));
        Assert.False(invalid.IsSuccess);

        var result = await service.CreateReviewSessionAsync(userId, new CreateReviewSessionRequest(boardId, "shuffle", "random", "UTC"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(boardId, repository.RequestedBoardId);
        Assert.NotEqual(Guid.Empty, repository.RequestedCreatedSessionId);
        Assert.Equal(repository.RequestedCreatedSessionId, result.Value!.SessionId);
        Assert.Equal(boardId, result.Value.BoardId);
    }

    [Fact]
    public async Task CreatePracticeSessionSummary_ValidatesCountsAndUsesAuthenticatedUserScope()
    {
        var practiceRepository = new RecordingPracticeRepository();
        var reviewRepository = new RecordingReviewRepository();
        var service = CreatePracticeService(practiceRepository, reviewRepository);
        var userId = Guid.NewGuid();
        var deckId = Guid.NewGuid();

        var invalid = await service.CreatePracticeSessionSummaryAsync(
            userId,
            new CreatePracticeSessionSummaryRequest(deckId, "dictation", 2, 2, 1, "UTC"));
        Assert.False(invalid.IsSuccess);

        var result = await service.CreatePracticeSessionSummaryAsync(
            userId,
            new CreatePracticeSessionSummaryRequest(deckId, "meaningToWord", 2, 1, 1, "UTC"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, practiceRepository.RequestedUserId);
        Assert.Equal(deckId, practiceRepository.RequestedDeckId);
        Assert.Equal(PracticeMode.MeaningToWord, practiceRepository.RequestedPracticeMode);
        Assert.Equal("UTC", practiceRepository.RequestedTimeZone?.Id);
        Assert.Equal(2, result.Value!.TotalCards);
        Assert.Equal(1, result.Value.CorrectCards);
        Assert.Equal(1, result.Value.WrongCards);
    }

    [Fact]
    public async Task AddPracticeWordsToReview_ValidatesAndUsesAuthenticatedUserScope()
    {
        var practiceRepository = new RecordingPracticeRepository();
        var reviewRepository = new RecordingReviewRepository();
        var service = CreatePracticeService(practiceRepository, reviewRepository);
        var userId = Guid.NewGuid();
        var deckId = Guid.NewGuid();

        var invalid = await service.AddPracticeWordsToReviewAsync(userId, new AddPracticeWordsToReviewRequest(Guid.Empty, "UTC"));
        Assert.False(invalid.IsSuccess);

        var result = await service.AddPracticeWordsToReviewAsync(userId, new AddPracticeWordsToReviewRequest(deckId, "UTC"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, reviewRepository.RequestedUserId);
        Assert.Equal(deckId, reviewRepository.RequestedDeckId);
        Assert.Equal(2, result.Value!.AddedWordCount);
    }

    [Fact]
    public async Task CreatePracticeSessionSummary_ReturnsValidationForInconsistentDeckSummary()
    {
        var practiceRepository = new RecordingPracticeRepository
        {
            PracticeSessionSaveStatus = PracticeSessionSummarySaveStatus.InconsistentSummary,
        };
        var reviewRepository = new RecordingReviewRepository();
        var service = CreatePracticeService(practiceRepository, reviewRepository);

        var result = await service.CreatePracticeSessionSummaryAsync(
            Guid.NewGuid(),
            new CreatePracticeSessionSummaryRequest(Guid.NewGuid(), "dictation", 2, 1, 1, "UTC"));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((PracticeError)result.Error!).Code);
    }

    [Fact]
    public async Task CreatePracticeSessionSummary_RejectsInvalidTimeZoneBeforeRepository()
    {
        var practiceRepository = new RecordingPracticeRepository();
        var reviewRepository = new RecordingReviewRepository();
        var service = CreatePracticeService(practiceRepository, reviewRepository);

        var result = await service.CreatePracticeSessionSummaryAsync(
            Guid.NewGuid(),
            new CreatePracticeSessionSummaryRequest(Guid.NewGuid(), "dictation", 2, 1, 1, "Invalid/Zone"));

        Assert.False(result.IsSuccess);
        Assert.Equal(Guid.Empty, practiceRepository.RequestedDeckId);
    }

    [Fact]
    public async Task GetReviewSessionSummary_ValidatesSessionAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingReviewRepository();
        var service = CreateReviewService(repository);
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        var invalid = await service.GetReviewSessionSummaryAsync(userId, Guid.Empty);
        Assert.False(invalid.IsSuccess);

        var result = await service.GetReviewSessionSummaryAsync(userId, sessionId);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(sessionId, repository.RequestedSummarySessionId);
        Assert.Equal(4, result.Value!.TotalWordsReviewed);
        Assert.Equal(75, result.Value.CorrectPercent);
    }

    [Fact]
    public async Task GetReviewSessionSummary_ReturnsNotFoundForForeignOrMissingSession()
    {
        var repository = new RecordingReviewRepository { SummaryMissing = true };
        var service = CreateReviewService(repository);

        var result = await service.GetReviewSessionSummaryAsync(Guid.NewGuid(), Guid.NewGuid());

        Assert.False(result.IsSuccess);
        Assert.Equal("DECK_OR_CARD_NOT_FOUND", ((ReviewError)result.Error!).Code);
    }

    [Fact]
    public async Task SubmitReview_RejectsInvalidTimeZoneBeforeRepository()
    {
        var repository = new RecordingReviewRepository();
        var service = CreateReviewService(repository);

        var result = await service.SubmitReviewAsync(
            Guid.NewGuid(),
            new SubmitReviewRequest(Guid.NewGuid(), Guid.NewGuid(), true, 8, "Invalid/Zone"));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((ReviewError)result.Error!).Code);
        Assert.Equal(Guid.Empty, repository.RequestedWordId);
    }

    [Fact]
    public void ReviewTime_UsesLearnerLocalCalendarDateAcrossDst()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

        var result = ReviewTime.NextReviewUtc(new DateTime(2026, 3, 8, 7, 30, 0, DateTimeKind.Utc), 1, zone);

        Assert.Equal(new DateTime(2026, 3, 9, 4, 0, 0, DateTimeKind.Utc), result);
    }

    [Fact]
    public async Task ReviewSettings_ValidatesAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingReviewRepository();
        var service = CreateReviewService(repository);
        var userId = Guid.NewGuid();

        var invalid = await service.UpdateReviewSettingsAsync(userId, new UpdateReviewSettingsRequest(0, true));
        Assert.False(invalid.IsSuccess);

        var result = await service.UpdateReviewSettingsAsync(userId, new UpdateReviewSettingsRequest(10, false));
        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(10, result.Value!.DailyLimit);
        Assert.False(result.Value.RecapAfterAnswer);
    }

    [Fact]
    public async Task PracticeSettings_ValidateAndUseAuthenticatedUserScope()
    {
        var practiceRepository = new RecordingPracticeRepository();
        var reviewRepository = new RecordingReviewRepository();
        var service = CreatePracticeService(practiceRepository, reviewRepository);
        var userId = Guid.NewGuid();

        var invalid = await service.UpdatePracticeSettingsAsync(userId, new UpdatePracticeSettingsRequest([]));
        Assert.False(invalid.IsSuccess);

        var result = await service.UpdatePracticeSettingsAsync(userId, new UpdatePracticeSettingsRequest(["dictation", "pronunciation"]));
        Assert.True(result.IsSuccess);
        Assert.Equal(userId, practiceRepository.RequestedUserId);
        Assert.Equal(["dictation", "pronunciation"], result.Value!.ModeSequence);
    }

    [Fact]
    public async Task GetDashboard_ValidatesTimeZoneAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingReviewRepository();
        var service = CreateReviewService(repository);
        var userId = Guid.NewGuid();
        var boardId = Guid.NewGuid();

        var invalid = await service.GetDashboardAsync(userId, boardId, "Invalid/Zone");
        Assert.False(invalid.IsSuccess);

        var result = await service.GetDashboardAsync(userId, boardId, "UTC");

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(boardId, repository.RequestedBoardId);
        Assert.Equal("UTC", repository.RequestedTimeZone?.Id);
        Assert.Equal(100, result.Value!.RetentionRate);
    }

    [Fact]
    public async Task GetDashboard_ReturnsNotFoundForForeignBoard()
    {
        var repository = new RecordingReviewRepository { DashboardMissing = true };
        var service = CreateReviewService(repository);

        var result = await service.GetDashboardAsync(Guid.NewGuid(), Guid.NewGuid(), "UTC");

        Assert.False(result.IsSuccess);
        Assert.Equal("DECK_OR_CARD_NOT_FOUND", ((ReviewError)result.Error!).Code);
    }

    [Fact]
    public void ReviewTime_CalculatesLearnerLocalDayBoundsAcrossDst()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

        var (start, end) = ReviewTime.LocalDayBoundsUtc(new DateTime(2026, 3, 8, 15, 0, 0, DateTimeKind.Utc), zone);

        Assert.Equal(new DateTime(2026, 3, 8, 5, 0, 0, DateTimeKind.Utc), start);
        Assert.Equal(new DateTime(2026, 3, 9, 4, 0, 0, DateTimeKind.Utc), end);
    }

    private static FlashcardService CreateFlashcardService(RecordingFlashcardRepository repository) =>
        new(repository);

    private static ReviewService CreateReviewService(RecordingReviewRepository repository) =>
        new(repository);

    private static PracticeService CreatePracticeService(RecordingPracticeRepository practiceRepository, RecordingReviewRepository reviewRepository)
    {
        var reviewService = CreateReviewService(reviewRepository);
        return new PracticeService(practiceRepository, reviewService);
    }

    private sealed class RecordingFlashcardRepository : IFlashcardRepository
    {
        public Guid RequestedUserId { get; private set; }
        public Guid RequestedSessionId { get; private set; }
        public Guid RequestedWordId { get; private set; }
        public Guid RequestedDeckId { get; private set; }
        public Guid RequestedCreatedSessionId { get; private set; }
        public Guid RequestedSummarySessionId { get; private set; }
        public Guid? RequestedBoardId { get; private set; }
        public PracticeMode RequestedPracticeMode { get; private set; }
        public bool RequestedCorrect { get; private set; }
        public int RequestedTimeSpentSeconds { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public bool DashboardMissing { get; init; }
        public bool SummaryMissing { get; init; }
        public PracticeSessionSummarySaveStatus PracticeSessionSaveStatus { get; init; } = PracticeSessionSummarySaveStatus.Success;

        public Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            var card = new FlashcardCardDto(
                Guid.NewGuid(), Guid.NewGuid(), "mitigate", "verb", "giam nhe", "make less severe",
                "Mitigate the risk.", null, null, null, null, null, 0);
            var deck = new FlashcardDeckDto(
                Guid.NewGuid(), Guid.NewGuid(), "HSK", "zh", Guid.NewGuid(), "HSK - Unit 1", "PageDeck", [card]);
            return Task.FromResult<IReadOnlyList<FlashcardDeckDto>>([deck]);
        }

        public Task<DeckSessionDto?> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult<DeckSessionDto?>(null);
        }
    }

    private sealed class RecordingPracticeRepository : IPracticeRepository
    {
        public Guid RequestedUserId { get; private set; }
        public Guid RequestedDeckId { get; private set; }
        public PracticeMode RequestedPracticeMode { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public PracticeSessionSummarySaveStatus PracticeSessionSaveStatus { get; init; } = PracticeSessionSummarySaveStatus.Success;

        public Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
            Guid userId,
            Guid deckId,
            PracticeMode mode,
            int totalCards,
            int correctCards,
            int wrongCards,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedDeckId = deckId;
            RequestedPracticeMode = mode;
            RequestedTimeZone = timeZone;

            if (PracticeSessionSaveStatus != PracticeSessionSummarySaveStatus.Success)
            {
                return Task.FromResult(new PracticeSessionSummarySaveResult(PracticeSessionSaveStatus, null));
            }

            return Task.FromResult(new PracticeSessionSummarySaveResult(
                PracticeSessionSummarySaveStatus.Success,
                new PracticeSessionSummaryDto(Guid.NewGuid(), userId, deckId, mode switch
                {
                    PracticeMode.Dictation => "dictation",
                    PracticeMode.MeaningToWord => "meaningToWord",
                    PracticeMode.Pronunciation => "pronunciation",
                    _ => "dictation",
                }, totalCards, correctCards, wrongCards, DateTime.UtcNow)));
        }

        public Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(new PracticeSettingsDto(["dictation", "meaningToWord", "pronunciation"]));
        }

        public Task<PracticeSettingsDto> UpdatePracticeSettingsAsync(
            Guid userId,
            IReadOnlyList<string> modeSequence,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(new PracticeSettingsDto(modeSequence));
        }
    }

    private sealed class RecordingReviewRepository : IReviewRepository
    {
        public Guid RequestedUserId { get; private set; }
        public Guid RequestedSessionId { get; private set; }
        public Guid RequestedWordId { get; private set; }
        public Guid RequestedDeckId { get; private set; }
        public Guid RequestedCreatedSessionId { get; private set; }
        public Guid RequestedSummarySessionId { get; private set; }
        public Guid? RequestedBoardId { get; private set; }
        public bool RequestedCorrect { get; private set; }
        public int RequestedTimeSpentSeconds { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public bool DashboardMissing { get; init; }
        public bool SummaryMissing { get; init; }

        public Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
            Guid userId,
            Guid deckId,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedDeckId = deckId;
            RequestedTimeZone = timeZone;
            return Task.FromResult<AddPracticeWordsToReviewDto?>(new AddPracticeWordsToReviewDto(deckId, 2, utcNow.AddDays(1)));
        }

        public Task<ReviewSessionCreatedDto?> CreateReviewSessionAsync(
            Guid userId,
            Guid boardId,
            string orderType,
            string mode,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            Guid sessionId,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedBoardId = boardId;
            RequestedTimeZone = timeZone;
            RequestedCreatedSessionId = sessionId;
            return Task.FromResult<ReviewSessionCreatedDto?>(new ReviewSessionCreatedDto(
                sessionId,
                boardId,
                "HSK",
                orderType,
                mode,
                4,
                [
                    new ReviewSessionWordDto(Guid.NewGuid(), "mitigate", "verb", "giam nhe", "make less severe", "Mitigate risk.", null, null, null, "dictation")
                ]));
        }

        public Task<ReviewSessionSummaryDto?> GetReviewSessionSummaryAsync(
            Guid userId,
            Guid sessionId,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedSummarySessionId = sessionId;
            return Task.FromResult(SummaryMissing
                ? null
                : new ReviewSessionSummaryDto(sessionId, 4, 3, 1, 75, 25, 8));
        }

        public Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(new ReviewSettingsDto(300, true));
        }

        public Task<ReviewSettingsDto> UpdateReviewSettingsAsync(
            Guid userId,
            int dailyLimit,
            bool recapAfterAnswer,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(new ReviewSettingsDto(dailyLimit, recapAfterAnswer));
        }

        public Task<FlashcardDashboardDto?> GetDashboardAsync(
            Guid userId,
            Guid? boardId,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedBoardId = boardId;
            RequestedTimeZone = timeZone;
            return Task.FromResult(DashboardMissing
                ? null
                : new FlashcardDashboardDto(boardId, "HSK", 3, 4, 2, 100, 1, 1, 1, [new DashboardForecastPointDto("2026-06-10", 2)]));
        }

        public Task<ReviewResultDto?> AddReviewAsync(
            Guid userId,
            Guid sessionId,
            Guid wordId,
            bool correct,
            int timeSpentSeconds,
            TimeZoneInfo timeZone,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedSessionId = sessionId;
            RequestedWordId = wordId;
            RequestedCorrect = correct;
            RequestedTimeSpentSeconds = timeSpentSeconds;
            RequestedTimeZone = timeZone;
            return Task.FromResult<ReviewResultDto?>(new ReviewResultDto(
                wordId,
                Guid.NewGuid(),
                correct ? "correct" : "wrong",
                0,
                correct ? 1 : 0,
                correct ? 0 : 1,
                DateTime.UtcNow.AddDays(correct ? 2 : 1)));
        }
    }
}
