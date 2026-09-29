using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Practice.Entities;

public sealed class PracticeSession : BaseEntity
{
    private PracticeSession()
    {
        PageName = string.Empty;
        BoardName = string.Empty;
        BoardLanguage = string.Empty;
    }

    private PracticeSession(
        Guid userId,
        Guid pageId,
        string pageName,
        Guid boardId,
        string boardName,
        string boardLanguage,
        DateTime startedAt)
        : this()
    {
        if (userId == Guid.Empty || pageId == Guid.Empty || boardId == Guid.Empty)
        {
            throw new ArgumentException("User, page, and board ids are required.");
        }

        UserId = userId;
        PageId = pageId;
        PageName = pageName;
        BoardId = boardId;
        BoardName = boardName;
        BoardLanguage = boardLanguage;
        Status = PracticeSessionStatus.Active;
        CurrentItemIndex = 0;
        StartedAt = DateTime.SpecifyKind(startedAt, DateTimeKind.Utc);
    }

    public Guid UserId { get; private set; }
    public Guid PageId { get; private set; }
    public string PageName { get; private set; }
    public Guid BoardId { get; private set; }
    public string BoardName { get; private set; }
    public string BoardLanguage { get; private set; }
    public PracticeSessionStatus Status { get; private set; }
    public int CurrentItemIndex { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime? CompletedAt { get; private set; }

    public static PracticeSession Create(
        Guid userId,
        Guid pageId,
        string pageName,
        Guid boardId,
        string boardName,
        string boardLanguage,
        DateTime startedAt) =>
        new(userId, pageId, pageName, boardId, boardName, boardLanguage, startedAt);

    public void AdvanceFrom(int expectedItemIndex, DateTime utcNow)
    {
        if (Status != PracticeSessionStatus.Active || CurrentItemIndex != expectedItemIndex)
        {
            throw new InvalidOperationException("The practice session is not at the expected item.");
        }

        CurrentItemIndex++;
        UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
    }

    public void Complete(int itemCount, DateTime utcNow)
    {
        if (Status == PracticeSessionStatus.Completed)
        {
            return;
        }

        if (Status != PracticeSessionStatus.Active || itemCount <= 0 || CurrentItemIndex < itemCount)
        {
            throw new InvalidOperationException("The practice session still has unfinished items.");
        }

        Status = PracticeSessionStatus.Completed;
        CompletedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        UpdatedAt = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
    }
}
