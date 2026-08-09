using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Hangfire;
using Hangfire.Server;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.BackgroundJobs;

/// <summary>
/// Moves every still-due active review state to the following Vietnam calendar day.
/// The Hangfire creation timestamp is used as the cutoff so a retry after midnight
/// cannot accidentally defer the next day's queue as well.
/// </summary>
public sealed class ReviewDueDeferralJob
{
    private static readonly TimeZoneInfo VietnamTimeZone = ResolveVietnamTimeZone();
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ReviewDueDeferralJob> _logger;

    public ReviewDueDeferralJob(AppDbContext dbContext, ILogger<ReviewDueDeferralJob> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<int> ExecuteAsync(PerformContext? context, CancellationToken cancellationToken = default)
    {
        var scheduledUtc = context?.BackgroundJob?.CreatedAt ?? DateTime.UtcNow;
        var cutoffDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(scheduledUtc, DateTimeKind.Utc), VietnamTimeZone));
        var nextDate = cutoffDate.AddDays(1);

        var dueStates = await _dbContext.WordReviewStates
            .Where(state => state.DeletedAt == null
                && state.Status == WordReviewStatus.Active
                && state.NextReviewDate <= cutoffDate)
            .ToListAsync(cancellationToken);

        foreach (var state in dueStates)
        {
            state.MoveDueDate(nextDate);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation(
            "ReviewDueDeferralJob moved {Count} due review states from Vietnam date {CutoffDate} to {NextDate}.",
            dueStates.Count,
            cutoffDate,
            nextDate);
        return dueStates.Count;
    }

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        throw new InvalidOperationException("The Vietnam timezone is not available on this host.");
    }
}
