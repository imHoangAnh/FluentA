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

    private sealed class RecordingFlashcardRepository : IFlashcardRepository
    {
        public Guid RequestedUserId { get; private set; }
        public Guid RequestedSessionId { get; private set; }
        public Guid RequestedCardId { get; private set; }
        public ReviewRating RequestedRating { get; private set; }
        public int RequestedTimeSpentSeconds { get; private set; }
        public TimeZoneInfo? RequestedTimeZone { get; private set; }
        public Guid ResultBoardId { get; } = Guid.NewGuid();
        public Guid ResultDeckId { get; } = Guid.NewGuid();
        public DeckType ResultDeckType { get; init; } = DeckType.AllWords;

        public Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            var card = new FlashcardCardDto(
                Guid.NewGuid(), Guid.NewGuid(), "mitigate", "verb", "giam nhe", "make less severe",
                "Mitigate the risk.", null, null, null, 0, 2.5f, 0, null, "new");
            var deck = new FlashcardDeckDto(
                Guid.NewGuid(), Guid.NewGuid(), "IELTS", Guid.NewGuid(), "IELTS - Unit 1", "PageDeck", [card]);
            return Task.FromResult<IReadOnlyList<FlashcardDeckDto>>([deck]);
        }

        public Task<DeckSessionDto?> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default)
        {
            RequestedUserId = userId;
            return Task.FromResult<DeckSessionDto?>(null);
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
