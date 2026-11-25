namespace FluentA.Application.BoundedContexts.Review;

public static class ReviewTime
{
    public static DateOnly UtcDate(DateTime utcDateTime) =>
        DateOnly.FromDateTime(DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc));

    public static DateOnly NextReviewDate(DateTime reviewedAtUtc, int intervalDays) =>
        UtcDate(reviewedAtUtc).AddDays(intervalDays);

    public static (DateTime StartUtc, DateTime EndUtc) UtcDateBounds(DateTime utcDate)
    {
        var start = DateTime.SpecifyKind(utcDate.Date, DateTimeKind.Utc);
        return (start, start.AddDays(1));
    }
}
