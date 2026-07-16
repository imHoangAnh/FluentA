namespace FluentA.Infrastructure.Persistence;

public sealed class LegacyAssetDeletionQueueItem
{
    private LegacyAssetDeletionQueueItem()
    {
        ObjectKey = string.Empty;
        Bucket = string.Empty;
        Status = "pending";
    }

    public string ObjectKey { get; private set; }
    public string Bucket { get; private set; }
    public string Status { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTime? ClaimedAt { get; private set; }
    public DateTime? DeletedAt { get; private set; }
    public string? LastError { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
}
