using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Flashcards.Entities;

public sealed class PracticeSettings : BaseEntity
{
    public static readonly string[] DefaultModeSequence =
    [
        "dictation",
        "meaningToWord",
        "pronunciation",
    ];

    private static readonly HashSet<string> AllowedModes =
    [
        "dictation",
        "meaningToWord",
        "pronunciation",
    ];

    private PracticeSettings()
    {
        ModeSequence = [];
    }

    private PracticeSettings(Guid userId, IReadOnlyList<string> modeSequence)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        ModeSequence = Normalize(modeSequence);
    }

    public Guid UserId { get; private set; }
    public IReadOnlyList<string> ModeSequence { get; private set; }

    public static PracticeSettings CreateDefault(Guid userId) =>
        new(userId, DefaultModeSequence);

    public static PracticeSettings Create(Guid userId, IReadOnlyList<string> modeSequence) =>
        new(userId, modeSequence);

    public void Update(IReadOnlyList<string> modeSequence)
    {
        ModeSequence = Normalize(modeSequence);
        UpdatedAt = DateTime.UtcNow;
    }

    private static IReadOnlyList<string> Normalize(IReadOnlyList<string> modeSequence)
    {
        if (modeSequence.Count == 0)
        {
            throw new ArgumentException("At least one practice mode is required.", nameof(modeSequence));
        }

        var normalized = new List<string>(modeSequence.Count);
        foreach (var mode in modeSequence)
        {
            var value = mode?.Trim() ?? string.Empty;
            if (!AllowedModes.Contains(value))
            {
                throw new ArgumentException($"Unsupported practice mode '{mode}'.", nameof(modeSequence));
            }

            if (normalized.Contains(value, StringComparer.Ordinal))
            {
                throw new ArgumentException("Practice modes must be unique.", nameof(modeSequence));
            }

            normalized.Add(value);
        }

        return normalized;
    }
}
