using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Todo.Entities;

public sealed class TodoPriority : BaseEntity
{
    public static readonly IReadOnlyList<string> AllowedTones = ["neutral", "primary", "warning", "destructive"];

    private TodoPriority()
    {
        Name = string.Empty;
        NormalizedName = string.Empty;
        Tone = "warning";
    }

    private TodoPriority(Guid userId, string name, string tone, int sortOrder)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        var cleanName = CleanName(name);
        UserId = userId;
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
        Tone = NormalizeTone(tone);
        SortOrder = ValidateSortOrder(sortOrder);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public string NormalizedName { get; private set; }
    public string Tone { get; private set; }
    public int SortOrder { get; private set; }

    public static TodoPriority Create(Guid userId, string name, string? tone = null, int sortOrder = 0)
    {
        return new TodoPriority(userId, name, tone ?? "warning", sortOrder);
    }

    public void Rename(string name)
    {
        var cleanName = CleanName(name);
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
        Touch();
    }

    public void SetTone(string tone)
    {
        Tone = NormalizeTone(tone);
        Touch();
    }

    public void SetSortOrder(int sortOrder)
    {
        SortOrder = ValidateSortOrder(sortOrder);
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        if (DeletedAt.HasValue)
        {
            return;
        }

        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 40)
        {
            throw new ArgumentException("Priority name must be between 1 and 40 characters.", nameof(name));
        }

        return cleaned;
    }

    private static string NormalizeTone(string tone)
    {
        var normalized = tone.Trim().ToLowerInvariant();
        if (!AllowedTones.Contains(normalized, StringComparer.Ordinal))
        {
            throw new ArgumentException("Priority tone must be neutral, primary, warning, or destructive.", nameof(tone));
        }

        return normalized;
    }

    private static int ValidateSortOrder(int sortOrder)
    {
        if (sortOrder < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sortOrder), "Priority sort order cannot be negative.");
        }

        return sortOrder;
    }
}
