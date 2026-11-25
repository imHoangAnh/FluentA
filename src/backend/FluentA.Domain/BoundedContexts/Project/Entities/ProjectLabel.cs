using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Project.Entities;

public sealed class ProjectLabel : BaseEntity
{
    public static readonly IReadOnlyList<string> AllowedTones = ["primary", "neutral", "success", "warning", "info"];

    private ProjectLabel()
    {
        Name = string.Empty;
        NormalizedName = string.Empty;
        Tone = "primary";
    }

    private ProjectLabel(Guid boardId, string name, string tone)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        var cleanName = CleanName(name);
        BoardId = boardId;
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
        Tone = NormalizeTone(tone);
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public string NormalizedName { get; private set; }
    public string Tone { get; private set; }

    public static ProjectLabel Create(Guid boardId, string name, string? tone = null)
    {
        return new ProjectLabel(boardId, name, tone ?? "primary");
    }

    public void Rename(string name)
    {
        var cleanName = CleanName(name);
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetTone(string tone)
    {
        Tone = NormalizeTone(tone);
        UpdatedAt = DateTime.UtcNow;
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

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 32)
        {
            throw new ArgumentException("Project label name must be between 1 and 32 characters.", nameof(name));
        }

        return cleaned;
    }

    private static string NormalizeTone(string tone)
    {
        var normalized = tone.Trim().ToLowerInvariant();
        if (!AllowedTones.Contains(normalized, StringComparer.Ordinal))
        {
            throw new ArgumentException("Label tone must be primary, neutral, success, warning, or info.", nameof(tone));
        }

        return normalized;
    }
}
