using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class FlashcardDeck : BaseEntity
{
    private FlashcardDeck()
    {
        Name = string.Empty;
    }

    private FlashcardDeck(Guid userId, Guid boardId, Guid? pageId, string name, DeckType type)
    {
        UserId = userId;
        BoardId = boardId;
        PageId = pageId;
        Name = CleanName(name);
        Type = type;
    }

    public Guid UserId { get; private set; }
    public Guid BoardId { get; private set; }
    public Guid? PageId { get; private set; }
    public string Name { get; private set; }
    public DeckType Type { get; private set; }

    public static FlashcardDeck CreateAllWords(Guid userId, Guid boardId, string boardName)
    {
        return new FlashcardDeck(userId, boardId, pageId: null, $"{boardName} - All Words", DeckType.AllWords);
    }

    public static FlashcardDeck CreatePageDeck(Guid userId, Guid boardId, Guid pageId, string boardName, string pageName)
    {
        return new FlashcardDeck(userId, boardId, pageId, $"{boardName} - {pageName}", DeckType.PageDeck);
    }

    public void Rename(string name)
    {
        Name = CleanName(name);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    private static string CleanName(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 240)
        {
            throw new ArgumentException("Deck name must be between 1 and 240 characters.", nameof(name));
        }

        return name.Trim();
    }
}
