using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Practice.Entities;

public sealed class PracticeSessionSummary : BaseEntity
{
    private PracticeSessionSummary()
    {
    }

    private PracticeSessionSummary(
        Guid userId,
        Guid deckId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        UserId = userId;
        DeckId = deckId;
        Mode = mode;
        TotalCards = totalCards;
        CorrectCards = correctCards;
        WrongCards = wrongCards;
        CompletedAt = completedAt;
    }

    public Guid UserId { get; private set; }
    public Guid DeckId { get; private set; }
    public PracticeMode Mode { get; private set; }
    public int TotalCards { get; private set; }
    public int CorrectCards { get; private set; }
    public int WrongCards { get; private set; }
    public DateTime CompletedAt { get; private set; }

    public static PracticeSessionSummary Create(
        Guid userId,
        Guid deckId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        if (userId == Guid.Empty || deckId == Guid.Empty)
        {
            throw new ArgumentException("User id and deck id are required.");
        }

        if (totalCards <= 0 || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            throw new ArgumentException("Practice summary counts are invalid.");
        }

        return new PracticeSessionSummary(userId, deckId, mode, totalCards, correctCards, wrongCards, completedAt);
    }
}
