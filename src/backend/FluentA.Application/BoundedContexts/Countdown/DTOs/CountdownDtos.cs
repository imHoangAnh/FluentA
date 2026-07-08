namespace FluentA.Application.BoundedContexts.Countdown.DTOs;

public sealed record CreateCountdownAlertRequest(string AlertDay, string AlertTime);

public sealed record CreateCountdownEventRequest(
    string Name,
    string TargetDate,
    IReadOnlyList<CreateCountdownAlertRequest> Alerts,
    Guid? CoverAssetId = null);

public sealed record CountdownAlertDto(
    Guid Id,
    string AlertDay,
    string AlertTime,
    DateTime ScheduledAtUtc,
    DateTime? FiredAtUtc);

public sealed record CountdownEventDto(
    Guid Id,
    string Name,
    string TargetDate,
    Guid? CoverAssetId,
    string? CoverUrl,
    bool IsCompleted,
    IReadOnlyList<CountdownAlertDto> Alerts,
    DateTime CreatedAt,
    DateTime UpdatedAt);
