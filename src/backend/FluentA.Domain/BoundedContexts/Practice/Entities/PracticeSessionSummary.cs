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
        string pageName,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        UserId = userId;
        PageId = pageId;
        PageName = pageName;
        Mode = mode;
        TotalCards = totalCards;
        CorrectCards = correctCards;
        WrongCards = wrongCards;
        CompletedAt = completedAt;
    }

    public Guid UserId { get; private set; }
    public Guid PageId { get; private set; }
    public string PageName { get; private set; } = string.Empty;
    public PracticeMode Mode { get; private set; }
    public int TotalCards { get; private set; }
    public int CorrectCards { get; private set; }
    public int WrongCards { get; private set; }
    public DateTime CompletedAt { get; private set; }

    public static PracticeSessionSummary Create(
        Guid userId,
        Guid pageId,
        string pageName,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        if (userId == Guid.Empty || pageId == Guid.Empty || string.IsNullOrWhiteSpace(pageName))
        {
            throw new ArgumentException("User id, page id, and page name are required.");
        }

        if (totalCards <= 0 || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            throw new ArgumentException("Practice summary counts are invalid.");
        }

        return new PracticeSessionSummary(userId, pageId, pageName, mode, totalCards, correctCards, wrongCards, completedAt);
    }

    public void UpdateCompletion(
        string pageName,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        DateTime completedAt)
    {
        if (string.IsNullOrWhiteSpace(pageName)
            || totalCards <= 0
            || correctCards < 0
            || wrongCards < 0
            || correctCards + wrongCards != totalCards)
        {
            throw new ArgumentException("Practice summary values are invalid.");
        }

        PageName = pageName;
        Mode = mode;
        TotalCards = totalCards;
        CorrectCards = correctCards;
        WrongCards = wrongCards;
        CompletedAt = completedAt;
        UpdatedAt = DateTime.UtcNow;
    }
}
