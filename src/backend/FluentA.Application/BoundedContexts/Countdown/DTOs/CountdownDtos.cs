namespace FluentA.Application.BoundedContexts.Countdown.DTOs;

public sealed record CreateCountdownEventRequest(
    string Name,
    string TargetDate,
    Guid? CoverAssetId = null);

public sealed record CountdownEventDto(
    Guid Id,
    string Name,
    string TargetDate,
    Guid? CoverAssetId,
    string? CoverDownloadUrl,
    DateTime? CoverDownloadUrlExpiresAt,
    bool IsCompleted,
    DateTime CreatedAt,
    DateTime UpdatedAt);
