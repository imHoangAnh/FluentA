using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Countdown.Entities;

public sealed class CountdownEvent : BaseEntity, IAggregateRoot
{
    private CountdownEvent()
    {
        Name = string.Empty;
    }

    private CountdownEvent(Guid userId, string name, DateTime targetDate, Guid? coverAssetId)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Name = CleanName(name);
        TargetDate = NormalizeDate(targetDate);
        CoverAssetId = ValidateCoverAssetId(coverAssetId);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public DateTime TargetDate { get; private set; }
    public Guid? CoverAssetId { get; private set; }

    public static CountdownEvent Create(
        Guid userId,
        string name,
        DateTime targetDate,
        Guid? coverAssetId = null)
    {
        return new CountdownEvent(userId, name, targetDate, coverAssetId);
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        if (DeletedAt.HasValue)
        {
            return;
        }

        var now = NormalizeUtc(nowUtc ?? DateTime.UtcNow);
        DeletedAt = now;
        UpdatedAt = now;
    }

    public bool IsCompletedAt(DateTime utcNow)
    {
        return NormalizeUtc(utcNow).Date > TargetDate.Date;
    }

    private static DateTime NormalizeDate(DateTime targetDate)
    {
        return DateTime.SpecifyKind(targetDate.Date, DateTimeKind.Utc);
    }

    private static DateTime NormalizeUtc(DateTime targetDate)
    {
        return targetDate.Kind switch
        {
            DateTimeKind.Utc => targetDate,
            DateTimeKind.Local => targetDate.ToUniversalTime(),
            _ => DateTime.SpecifyKind(targetDate, DateTimeKind.Utc),
        };
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 180)
        {
            throw new ArgumentException("Countdown name must be between 1 and 180 characters.", nameof(name));
        }

        return cleaned;
    }

    private static Guid? ValidateCoverAssetId(Guid? coverAssetId)
    {
        if (coverAssetId == Guid.Empty)
        {
            throw new ArgumentException("Countdown cover asset id must be a non-empty GUID.", nameof(coverAssetId));
        }

        return coverAssetId;
    }
}
