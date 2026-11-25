using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Todo.Entities;

public sealed class TodoTag : BaseEntity
{
    private TodoTag()
    {
        Name = string.Empty;
        NormalizedName = string.Empty;
    }

    private TodoTag(Guid userId, string name)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        var cleanName = CleanName(name);
        UserId = userId;
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public string NormalizedName { get; private set; }

    public static TodoTag Create(Guid userId, string name)
    {
        return new TodoTag(userId, name);
    }

    public void Rename(string name)
    {
        var cleanName = CleanName(name);
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
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

    public static string CleanName(string name)
    {
        var cleaned = name.Trim().TrimStart('#').Trim();
        if (cleaned.Length is < 1 or > 32)
        {
            throw new ArgumentException("Tag name must be between 1 and 32 characters.", nameof(name));
        }

        return cleaned;
    }
}
