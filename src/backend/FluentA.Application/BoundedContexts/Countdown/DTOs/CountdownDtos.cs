namespace FluentA.Application.BoundedContexts.Countdown.DTOs;

public sealed record CreateCountdownEventRequest(string Name, string TargetDate, string? Color = null, string? Icon = null);

public sealed record UpdateCountdownEventRequest(
    string? Name = null,
    string? TargetDate = null,
    string? Color = null,
    string? Icon = null);

public sealed record CountdownEventDto(
    Guid Id,
    string Name,
    string TargetDate,
    string? Color,
    string? Icon,
    bool IsCompleted,
    DateTime CreatedAt,
    DateTime UpdatedAt);
