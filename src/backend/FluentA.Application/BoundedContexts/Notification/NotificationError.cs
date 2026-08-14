using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Notification;

public sealed record NotificationError(string Code, string Message, int StatusCode, object? Details = null) : IApplicationError
{
    public static NotificationError NotFound() =>
        new("NOTIFICATION_NOT_FOUND", "Notification not found.", 404);
}
