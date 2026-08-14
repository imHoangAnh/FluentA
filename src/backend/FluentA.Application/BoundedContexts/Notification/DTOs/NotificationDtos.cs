namespace FluentA.Application.BoundedContexts.Notification.DTOs;

public sealed record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    string? ActionPath,
    DateTime? ReadAt,
    DateTime CreatedAt);

public sealed record NotificationUnreadCountDto(int Count);

public sealed record NotificationReadDto(Guid Id, DateTime? ReadAt);

public sealed record NotificationMarkAllReadDto(int Count);
