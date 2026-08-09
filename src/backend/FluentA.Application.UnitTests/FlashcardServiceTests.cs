using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.UnitTests;

public sealed class FlashcardServiceTests
{
    [Fact]
    public async Task ListBoards_UsesAuthenticatedUserScope()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);
        var userId = Guid.NewGuid();

        var boards = await service.ListBoardsAsync(userId);

        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Single(boards);
        Assert.Single(boards[0].Pages);
        Assert.Single(boards[0].Pages[0].Words);
        Assert.Equal("zh", boards[0].BoardLanguage);
        Assert.Equal("/ˈmɪt.ɪ.ɡeɪt/", boards[0].Pages[0].Words[0].IpaPronunciation);
        Assert.Equal("reduce", boards[0].Pages[0].Words[0].Synonyms);
        Assert.Equal("worsen", boards[0].Pages[0].Words[0].Antonyms);
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
        var pageId = Guid.NewGuid();

        var invalid = await service.CreatePracticeSessionSummaryAsync(
            userId,
            new CreatePracticeSessionSummaryRequest(pageId, "dictation", 2, 2, 1, "UTC"));
        Assert.False(invalid.IsSuccess);

        var result = await service.CreatePracticeSessionSummaryAsync(
            userId,
            new CreatePracticeSessionSummaryRequest(pageId, "meaningToWord", 2, 1, 1, "UTC"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, practiceRepository.RequestedUserId);
        Assert.Equal(pageId, practiceRepository.RequestedPageId);
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
        var pageId = Guid.NewGuid();

        var invalid = await service.AddPracticeWordsToReviewAsync(userId, new AddPracticeWordsToReviewRequest(Guid.Empty, Guid.Empty, "UTC"));
        Assert.False(invalid.IsSuccess);

        var wordId = Guid.NewGuid();
        var result = await service.AddPracticeWordsToReviewAsync(userId, new AddPracticeWordsToReviewRequest(pageId, wordId, "UTC"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, reviewRepository.RequestedUserId);
        Assert.Equal(pageId, reviewRepository.RequestedPageId);
        Assert.Equal(wordId, reviewRepository.RequestedWordId);
        Assert.Equal("added", result.Value!.Status);
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
        Assert.Equal(Guid.Empty, practiceRepository.RequestedPageId);
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

        var result = ReviewTime.NextReviewDate(new DateTime(2026, 3, 8, 7, 30, 0, DateTimeKind.Utc), 1, zone);

        Assert.Equal(new DateOnly(2026, 3, 9), result);
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
        public Guid RequestedPageId { get; private set; }
        public Guid RequestedCreatedSessionId { get; private set; }
        public Guid? RequestedBoardId { get; private set; }
        public PracticeMode RequestedPracticeMode { get; private set; }
        public bool RequestedCorrect { get; private set; }
        public int RequestedTimeSpentSeconds { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public bool DashboardMissing { get; init; }
        public PracticeSessionSummarySaveStatus PracticeSessionSaveStatus { get; init; } = PracticeSessionSummarySaveStatus.Success;

        public Task<IReadOnlyList<FlashcardBoardDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            var word = new FlashcardCardDto(
                Guid.NewGuid(), Guid.NewGuid(), "mitigate", "verb", "/ˈmɪt.ɪ.ɡeɪt/", "giam nhe", "make less severe",
                "Mitigate the risk.", "reduce", "worsen", null, false, null, null, 0);
            var page = new FlashcardPageDto(Guid.NewGuid(), "HSK - Unit 1", false, [word]);
            var board = new FlashcardBoardDto(Guid.NewGuid(), "HSK", "zh", [page]);
            return Task.FromResult<IReadOnlyList<FlashcardBoardDto>>([board]);
        }

        public Task<PageSessionDto?> GetPageSessionAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult<PageSessionDto?>(null);
        }
    }

    private sealed class RecordingPracticeRepository : IPracticeRepository
    {
        public Guid RequestedUserId { get; private set; }
        public Guid RequestedPageId { get; private set; }
        public PracticeMode RequestedPracticeMode { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public PracticeSessionSummarySaveStatus PracticeSessionSaveStatus { get; init; } = PracticeSessionSummarySaveStatus.Success;

        public Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
            Guid userId,
            Guid pageId,
            PracticeMode mode,
            int totalCards,
            int correctCards,
            int wrongCards,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedPageId = pageId;
            RequestedPracticeMode = mode;
            RequestedTimeZone = timeZone;

            if (PracticeSessionSaveStatus != PracticeSessionSummarySaveStatus.Success)
            {
                return Task.FromResult(new PracticeSessionSummarySaveResult(PracticeSessionSaveStatus, null));
            }

            return Task.FromResult(new PracticeSessionSummarySaveResult(
                PracticeSessionSummarySaveStatus.Success,
                new PracticeSessionSummaryDto(Guid.NewGuid(), userId, pageId, mode switch
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
        public Guid RequestedPageId { get; private set; }
        public Guid RequestedCreatedSessionId { get; private set; }
        public Guid? RequestedBoardId { get; private set; }
        public bool RequestedCorrect { get; private set; }
        public int RequestedTimeSpentSeconds { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public bool DashboardMissing { get; init; }

        public Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
            Guid userId,
            Guid pageId,
            Guid wordId,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedPageId = pageId;
            RequestedWordId = wordId;
            RequestedTimeZone = timeZone;
            return Task.FromResult<AddPracticeWordsToReviewDto?>(new AddPracticeWordsToReviewDto(pageId, wordId, "added", DateOnly.FromDateTime(utcNow).AddDays(1)));
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
                utcNow,
                4,
                [
                    new ReviewSessionWordDto(Guid.NewGuid(), "mitigate", "verb", "/mɪtɪɡeɪt/", "giam nhe", "make less severe", "Mitigate risk.", null, null, null, "dictation")
                ]));
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
                DateOnly.FromDateTime(DateTime.UtcNow).AddDays(correct ? 2 : 1)));
        }

        public Task<IReadOnlyList<LevelFiveReviewItemDto>> ListLevelFiveWordsAsync(
            Guid userId,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult<IReadOnlyList<LevelFiveReviewItemDto>>([]);
        }

        public Task<int> RemoveLevelFiveWordsAsync(
            Guid userId,
            IReadOnlyList<Guid> wordIds,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(0);
        }
    }
}
