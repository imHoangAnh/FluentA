using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabBoard : BaseEntity, IAggregateRoot
{
    private readonly List<VocabPage> _pages = [];

    private VocabBoard()
    {
        Name = string.Empty;
        Language = string.Empty;
    }

    private VocabBoard(Guid userId, string name, string language, int sortOrder)
    {
        UserId = userId;
        Name = CleanName(name);
        Language = CleanLanguage(language);
        SortOrder = sortOrder;
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public string Language { get; private set; }
    public int SortOrder { get; private set; }
    public IReadOnlyList<VocabPage> Pages => _pages.AsReadOnly();

    public static VocabBoard Create(Guid userId, string name, string language, int sortOrder = 0)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        return new VocabBoard(userId, name, language, sortOrder);
    }

    public VocabPage AddPage(string name, int sortOrder)
    {
        var page = VocabPage.Create(Id, name, sortOrder);
        _pages.Add(page);
        UpdatedAt = DateTime.UtcNow;
        return page;
    }

    public void Update(string name, string language, int sortOrder)
    {
        Name = CleanName(name);
        Language = CleanLanguage(language);
        SortOrder = sortOrder;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    private static string CleanName(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            throw new ArgumentException("Board name must be between 1 and 120 characters.", nameof(name));
        }

        return name.Trim();
    }

    private static string CleanLanguage(string language)
    {
        var cleaned = language.Trim().ToLowerInvariant();
        if (cleaned.Length is < 2 or > 8)
        {
            throw new ArgumentException("Language must be a 2-8 character code.", nameof(language));
        }

        return cleaned;
    }
}
