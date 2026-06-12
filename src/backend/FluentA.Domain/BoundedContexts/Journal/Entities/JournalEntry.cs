using FluentA.Domain.SeedWork;
using System.Globalization;

namespace FluentA.Domain.BoundedContexts.Journal.Entities;

public sealed class JournalEntry : BaseEntity, IAggregateRoot
{
    private const int PreviewLength = 100;

    private JournalEntry()
    {
        Title = string.Empty;
        Content = string.Empty;
        PlainTextContent = string.Empty;
        Preview = string.Empty;
    }

    private JournalEntry(Guid userId, string title, string? content, string? plainTextContent, DateTime? learningDate)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Title = CleanTitle(title);
        Content = CleanContent(content);
        PlainTextContent = CleanPlainTextContent(plainTextContent);
        Preview = BuildPreview(PlainTextContent);
        LearningDate = NormalizeLearningDate(learningDate);
    }

    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string Content { get; private set; }
    public string PlainTextContent { get; private set; }
    public string Preview { get; private set; }
    public DateTime? LearningDate { get; private set; }

    public static JournalEntry Create(
        Guid userId,
        string title,
        string? content = null,
        string? plainTextContent = null,
        DateTime? learningDate = null)
    {
        return new JournalEntry(userId, title, content, plainTextContent, learningDate);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        Touch();
    }

    public void UpdateContent(string? content, string? plainTextContent)
    {
        Content = CleanContent(content);
        PlainTextContent = CleanPlainTextContent(plainTextContent);
        Preview = BuildPreview(PlainTextContent);
        Touch();
    }

    public void UpdateLearningDate(DateTime? learningDate)
    {
        LearningDate = NormalizeLearningDate(learningDate);
        Touch();
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
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

    private static string CleanPlainTextContent(string? content)
    {
        var cleaned = content ?? string.Empty;
        if (cleaned.Length > 100_000)
        {
            throw new ArgumentException("Journal plain text content must be at most 100000 characters.", nameof(content));
        }

        return cleaned;
    }

    private static string BuildPreview(string content)
    {
        var normalized = string.Join(' ', content.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        var textElements = StringInfo.ParseCombiningCharacters(normalized);
        return textElements.Length <= PreviewLength ? normalized : normalized[..textElements[PreviewLength]];
    }

    private static DateTime? NormalizeLearningDate(DateTime? learningDate)
    {
        return learningDate is null ? null : DateTime.SpecifyKind(learningDate.Value.Date, DateTimeKind.Utc);
    }
}
