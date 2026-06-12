using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notifications")]
public sealed class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public NotificationsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        var items = await _db.Notifications.Where(x => x.UserId == userId && x.DeletedAt == null)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new { x.Id, x.Type, x.Title, x.Message, x.ReadAt, x.CreatedAt })
            .ToListAsync(cancellationToken);
        return Ok(ApiEnvelope<object>.Ok(items));
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken cancellationToken)
    {
        var count = await _db.Notifications.CountAsync(x => x.UserId == CurrentUserId() && x.DeletedAt == null && x.ReadAt == null, cancellationToken);
        return Ok(ApiEnvelope<object>.Ok(new { count }));
    }

    [HttpPatch("{notificationId:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid notificationId, CancellationToken cancellationToken)
    {
        var item = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == notificationId && x.UserId == CurrentUserId() && x.DeletedAt == null, cancellationToken);
        if (item is null) return NotFound(ApiEnvelope<object>.Fail(new ApiErrorEnvelope("NOTIFICATION_NOT_FOUND", "Notification not found.")));
        item.MarkRead();
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ApiEnvelope<object>.Ok(new { item.Id, item.ReadAt }));
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        var items = await _db.Notifications.Where(x => x.UserId == CurrentUserId() && x.DeletedAt == null && x.ReadAt == null).ToListAsync(cancellationToken);
        items.ForEach(x => x.MarkRead());
        await _db.SaveChangesAsync(cancellationToken);
        return Ok(ApiEnvelope<object>.Ok(new { count = items.Count }));
    }

    private Guid CurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);
}
