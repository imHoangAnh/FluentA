using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Practice.Entities;

public sealed class PracticeSessionSummary : BaseEntity
{
    private PracticeSessionSummary()
    {
    }

    private PracticeSessionSummary(
        Guid userId,
        Guid pageId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        UserId = userId;
        PageId = pageId;
        Mode = mode;
        TotalCards = totalCards;
        CorrectCards = correctCards;
        WrongCards = wrongCards;
        CompletedAt = completedAt;
    }

    public Guid UserId { get; private set; }
    public Guid PageId { get; private set; }
    public PracticeMode Mode { get; private set; }
    public int TotalCards { get; private set; }
    public int CorrectCards { get; private set; }
    public int WrongCards { get; private set; }
    public DateTime CompletedAt { get; private set; }

    public static PracticeSessionSummary Create(
        Guid userId,
        Guid pageId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        if (userId == Guid.Empty || pageId == Guid.Empty)
        {
            throw new ArgumentException("User id and page id are required.");
        }

        if (totalCards <= 0 || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            throw new ArgumentException("Practice summary counts are invalid.");
        }

        return new PracticeSessionSummary(userId, pageId, mode, totalCards, correctCards, wrongCards, completedAt);
    }

    public void UpdateCompletion(
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        if (totalCards <= 0 || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            throw new ArgumentException("Practice summary counts are invalid.");
        }

        Mode = mode;
        TotalCards = totalCards;
        CorrectCards = correctCards;
        WrongCards = wrongCards;
        CompletedAt = completedAt;
        UpdatedAt = DateTime.UtcNow;
    }
}
