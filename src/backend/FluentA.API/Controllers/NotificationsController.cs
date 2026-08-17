using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Notification;
using FluentA.Application.BoundedContexts.Notification.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notifications")]
public sealed class NotificationsController : ApiControllerBase
{
    private readonly INotificationService _notifications;

    public NotificationsController(INotificationService notifications) => _notifications = notifications;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _notifications.ListAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<NotificationDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken cancellationToken)
    {
        var result = await _notifications.UnreadCountAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<NotificationUnreadCountDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPatch("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken cancellationToken)
    {
        var result = await _notifications.MarkReadAsync(CurrentUserId(), notificationId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<NotificationReadDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var result = await _notifications.MarkAllReadAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<NotificationMarkAllReadDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }
}
