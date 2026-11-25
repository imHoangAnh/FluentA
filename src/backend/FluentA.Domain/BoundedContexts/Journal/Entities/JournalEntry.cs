using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Journal.Entities;

public sealed class JournalEntry : BaseEntity, IAggregateRoot
{
    public const int MaxTags = 10;
    public const int MaxTagLength = 32;

    public static readonly IReadOnlyList<string> AllowedMoods =
    [
        "peaceful",
        "grateful",
        "energized",
        "reflective",
        "tired",
        "stressed"
    ];

    private JournalEntry()
    {
        Title = string.Empty;
        Content = string.Empty;
        Tags = [];
    }

    private JournalEntry(
        Guid userId,
        string title,
        string? content,
        DateTime date,
        string? mood,
        bool isStarred,
        IEnumerable<string>? tags)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Title = CleanTitle(title);
        Content = CleanContent(content);
        Date = NormalizeDate(date);
        Mood = CleanMood(mood);
        IsStarred = isStarred;
        Tags = CleanTags(tags);
    }

    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string Content { get; private set; }
    public DateTime Date { get; private set; }
    public string? Mood { get; private set; }
    public bool IsStarred { get; private set; }
    public List<string> Tags { get; private set; }

    public static JournalEntry Create(
        Guid userId,
        string title,
        DateTime date,
        string? content = null,
        string? mood = null,
        bool isStarred = false,
        IEnumerable<string>? tags = null)
    {
        return new JournalEntry(userId, title, content, date, mood, isStarred, tags);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        Touch();
    }

    public void UpdateContent(string? content)
    {
        Content = CleanContent(content);
        Touch();
    }

    public void UpdateDate(DateTime date)
    {
        Date = NormalizeDate(date);
        Touch();
    }

    public void UpdateMood(string? mood)
    {
        Mood = CleanMood(mood);
        Touch();
    }

    public void SetStarred(bool isStarred)
    {
        IsStarred = isStarred;
        Touch();
    }

    public void UpdateTags(IEnumerable<string>? tags)
    {
        Tags = CleanTags(tags);
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        DeletedAt = nowUtc ?? DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static string CleanTitle(string title)
    {
        var cleaned = title.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Journal title must be between 1 and 240 characters.", nameof(title));
        }

        return cleaned;
    }

    private static string CleanContent(string? content)
    {
        var cleaned = content ?? string.Empty;
        if (cleaned.Length > 100_000)
        {
            throw new ArgumentException("Journal content must be at most 100000 characters.", nameof(content));
        }

        return cleaned;
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }

    private static string? CleanMood(string? mood)
    {
        if (string.IsNullOrWhiteSpace(mood))
        {
            return null;
        }

        var normalized = mood.Trim().ToLowerInvariant();
        if (!AllowedMoods.Contains(normalized))
        {
            throw new ArgumentException(
                $"Mood must be one of: {string.Join(", ", AllowedMoods)}.",
                nameof(mood));
        }

        return normalized;
    }

    private static List<string> CleanTags(IEnumerable<string>? tags)
    {
        if (tags is null)
        {
            return [];
        }

        var result = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var rawTag in tags)
        {
            var normalized = (rawTag ?? string.Empty).Trim().TrimStart('#').Trim().ToLowerInvariant();
            if (normalized.Length is < 1 or > MaxTagLength)
            {
                throw new ArgumentException(
                    $"Each tag must be between 1 and {MaxTagLength} characters.",
                    nameof(tags));
            }

            if (!seen.Add(normalized))
            {
                continue;
            }

            if (result.Count >= MaxTags)
            {
                throw new ArgumentException($"At most {MaxTags} tags are allowed.", nameof(tags));
            }

            result.Add(normalized);
        }

        return result;
    }
}
