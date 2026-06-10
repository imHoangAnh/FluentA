using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;

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
    public async Task SubmitReview_ValidatesUsesAuthenticatedUserScopeAndNotifiesAllWords()
    {
        var repository = new RecordingFlashcardRepository();
        var notifier = new RecordingNotifier();
        var service = new FlashcardService(repository, notifier);
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();
        var cardId = Guid.NewGuid();

        var result = await service.SubmitReviewAsync(userId, new SubmitReviewRequest(sessionId, cardId, 2, 8, "Asia/Ho_Chi_Minh"));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(sessionId, repository.RequestedSessionId);
        Assert.Equal(cardId, repository.RequestedCardId);
        Assert.Equal(ReviewRating.Good, repository.RequestedRating);
        Assert.Equal(8, repository.RequestedTimeSpentSeconds);
        Assert.Equal("Asia/Ho_Chi_Minh", repository.RequestedTimeZone?.Id);
        Assert.Equal(repository.ResultBoardId, notifier.BoardId);
        Assert.Equal(repository.ResultDeckId, Assert.Single(notifier.DeckIds));
    }

    [Fact]
    public async Task CreateReviewSession_ValidatesDeckAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);
        var userId = Guid.NewGuid();
        var deckId = Guid.NewGuid();

        var invalid = await service.CreateReviewSessionAsync(userId, new CreateReviewSessionRequest(Guid.Empty));
        Assert.False(invalid.IsSuccess);

        var result = await service.CreateReviewSessionAsync(userId, new CreateReviewSessionRequest(deckId));

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(deckId, repository.RequestedDeckId);
        Assert.NotEqual(Guid.Empty, repository.RequestedCreatedSessionId);
        Assert.Equal(repository.RequestedCreatedSessionId, result.Value!.SessionId);
        Assert.Equal(deckId, result.Value.DeckId);
    }

    [Fact]
    public async Task GetReviewSessionSummary_ValidatesSessionAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);
        var userId = Guid.NewGuid();
        var sessionId = Guid.NewGuid();

        var invalid = await service.GetReviewSessionSummaryAsync(userId, Guid.Empty);
        Assert.False(invalid.IsSuccess);

        var result = await service.GetReviewSessionSummaryAsync(userId, sessionId);

        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(sessionId, repository.RequestedSummarySessionId);
        Assert.Equal(4, result.Value!.TotalCardsReviewed);
        Assert.Equal(25, result.Value.EasyPercent);
    }

    [Fact]
    public async Task GetReviewSessionSummary_ReturnsNotFoundForForeignOrMissingSession()
    {
        var repository = new RecordingFlashcardRepository { SummaryMissing = true };
        var service = new FlashcardService(repository);

        var result = await service.GetReviewSessionSummaryAsync(Guid.NewGuid(), Guid.NewGuid());

        Assert.False(result.IsSuccess);
        Assert.Equal("DECK_OR_CARD_NOT_FOUND", ((FlashcardError)result.Error!).Code);
    }

    [Fact]
    public async Task SubmitReview_RejectsInvalidRatingAndTimeZoneBeforeRepository()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);

        var result = await service.SubmitReviewAsync(
            Guid.NewGuid(),
            new SubmitReviewRequest(Guid.NewGuid(), Guid.NewGuid(), 7, 8, "Invalid/Zone"));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((FlashcardError)result.Error!).Code);
        Assert.Equal(Guid.Empty, repository.RequestedCardId);
    }

    [Fact]
    public void ReviewTime_UsesLearnerLocalCalendarDateAcrossDst()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

        var result = ReviewTime.NextReviewUtc(new DateTime(2026, 3, 8, 7, 30, 0, DateTimeKind.Utc), 1, zone);

        Assert.Equal(new DateTime(2026, 3, 9, 4, 0, 0, DateTimeKind.Utc), result);
    }

    [Fact]
    public async Task SubmitReview_DoesNotNotifyForPageDeck()
    {
        var repository = new RecordingFlashcardRepository { ResultDeckType = DeckType.PageDeck };
        var notifier = new RecordingNotifier();
        var service = new FlashcardService(repository, notifier);

        var result = await service.SubmitReviewAsync(
            Guid.NewGuid(),
            new SubmitReviewRequest(Guid.NewGuid(), Guid.NewGuid(), 1, 3, "UTC"));

        Assert.True(result.IsSuccess);
        Assert.Empty(notifier.DeckIds);
    }

    [Fact]
    public async Task ReviewSettings_ValidatesAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);
        var userId = Guid.NewGuid();

        var invalid = await service.UpdateReviewSettingsAsync(userId, new UpdateReviewSettingsRequest(-1, 200));
        Assert.False(invalid.IsSuccess);

        var result = await service.UpdateReviewSettingsAsync(userId, new UpdateReviewSettingsRequest(10, 100));
        Assert.True(result.IsSuccess);
        Assert.Equal(userId, repository.RequestedUserId);
        Assert.Equal(10, result.Value!.NewCardsPerDay);
        Assert.Equal(100, result.Value.ReviewCardsPerDay);
    }

    [Fact]
    public async Task GetDueDeck_RejectsInvalidTimeZoneBeforeRepository()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);

        var result = await service.GetDueDeckAsync(Guid.NewGuid(), Guid.NewGuid(), "Invalid/Zone");

        Assert.False(result.IsSuccess);
        Assert.Equal(Guid.Empty, repository.RequestedDeckId);
    }

    [Fact]
    public async Task GetDashboard_ValidatesTimeZoneAndUsesAuthenticatedUserScope()
    {
        var repository = new RecordingFlashcardRepository();
        var service = new FlashcardService(repository);
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
        var repository = new RecordingFlashcardRepository { DashboardMissing = true };
        var service = new FlashcardService(repository);

        var result = await service.GetDashboardAsync(Guid.NewGuid(), Guid.NewGuid(), "UTC");

        Assert.False(result.IsSuccess);
        Assert.Equal("DECK_OR_CARD_NOT_FOUND", ((FlashcardError)result.Error!).Code);
    }

    [Fact]
    public void ReviewTime_CalculatesLearnerLocalDayBoundsAcrossDst()
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

        var (start, end) = ReviewTime.LocalDayBoundsUtc(new DateTime(2026, 3, 8, 15, 0, 0, DateTimeKind.Utc), zone);

        Assert.Equal(new DateTime(2026, 3, 8, 5, 0, 0, DateTimeKind.Utc), start);
        Assert.Equal(new DateTime(2026, 3, 9, 4, 0, 0, DateTimeKind.Utc), end);
    }

    private sealed class RecordingFlashcardRepository : IFlashcardRepository
    {
        public Guid RequestedUserId { get; private set; }
        public Guid RequestedSessionId { get; private set; }
        public Guid RequestedCardId { get; private set; }
        public Guid RequestedDeckId { get; private set; }
        public Guid RequestedCreatedSessionId { get; private set; }
        public Guid RequestedSummarySessionId { get; private set; }
        public Guid? RequestedBoardId { get; private set; }
        public ReviewRating RequestedRating { get; private set; }
        public int RequestedTimeSpentSeconds { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public Guid ResultBoardId { get; } = Guid.NewGuid();
        public Guid ResultDeckId { get; } = Guid.NewGuid();
        public DeckType ResultDeckType { get; init; } = DeckType.AllWords;
        public bool DashboardMissing { get; init; }
        public bool SummaryMissing { get; init; }

        public Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            var card = new FlashcardCardDto(
                Guid.NewGuid(), Guid.NewGuid(), "mitigate", "verb", "giam nhe", "make less severe",
                "Mitigate the risk.", null, null, null, 0, 2.5f, 0, null, "new");
            var deck = new FlashcardDeckDto(
                Guid.NewGuid(), Guid.NewGuid(), "HSK", "zh", Guid.NewGuid(), "HSK - Unit 1", "PageDeck", [card]);
            return Task.FromResult<IReadOnlyList<FlashcardDeckDto>>([deck]);
        }

        public Task<DeckSessionDto?> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult<DeckSessionDto?>(null);
        }

        public Task<ReviewSessionCreatedDto?> CreateReviewSessionAsync(
            Guid userId,
            Guid deckId,
            Guid sessionId,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedDeckId = deckId;
            RequestedCreatedSessionId = sessionId;
            return Task.FromResult<ReviewSessionCreatedDto?>(new ReviewSessionCreatedDto(
                sessionId,
                deckId,
                "HSK - Unit 1",
                DeckType.PageDeck.ToString(),
                4));
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
                : new ReviewSessionSummaryDto(sessionId, 4, 1, 1, 1, 1, 25, 25, 25, 25, 8));
        }

        public Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(new ReviewSettingsDto(20, 200));
        }

        public Task<ReviewSettingsDto> UpdateReviewSettingsAsync(
            Guid userId,
            int newCardsPerDay,
            int reviewCardsPerDay,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult(new ReviewSettingsDto(newCardsPerDay, reviewCardsPerDay));
        }

        public Task<DueDeckDto?> GetDueDeckAsync(
            Guid userId,
            Guid deckId,
            TimeZoneInfo timeZone,
            DateTime utcNow,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedDeckId = deckId;
            return Task.FromResult<DueDeckDto?>(null);
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
            Guid cardId,
            ReviewRating rating,
            int timeSpentSeconds,
            TimeZoneInfo timeZone,
            CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            RequestedSessionId = sessionId;
            RequestedCardId = cardId;
            RequestedRating = rating;
            RequestedTimeSpentSeconds = timeSpentSeconds;
            RequestedTimeZone = timeZone;
            return Task.FromResult<ReviewResultDto?>(new ReviewResultDto(
                cardId, Guid.NewGuid(), ResultBoardId, ResultDeckId, ResultDeckType.ToString(),
                rating.ToString().ToLowerInvariant(), 1, 2.5f, 1, DateTime.UtcNow.AddDays(1), "learning"));
        }
    }

    private sealed class RecordingNotifier : IFlashcardSyncNotifier
    {
        public Guid BoardId { get; private set; }
        public IReadOnlyList<Guid> DeckIds { get; private set; } = [];

        public Task WordSavedAsync(Guid userId, Guid wordId, Guid pageId, CancellationToken cancellationToken = default)
            => Task.CompletedTask;

        public Task DecksUpdatedAsync(Guid userId, Guid boardId, IReadOnlyList<Guid> deckIds, CancellationToken cancellationToken = default)
        {
            BoardId = boardId;
            DeckIds = deckIds;
            return Task.CompletedTask;
        }
    }
}
