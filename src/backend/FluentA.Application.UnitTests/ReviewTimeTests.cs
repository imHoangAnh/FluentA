using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review;

namespace FluentA.Application.UnitTests;

public sealed class ReviewTimeTests
{
    [Theory]
    [InlineData(23, 59, 17)]
    [InlineData(0, 0, 18)]
    public void ReviewCalendarChangesAtUtcMidnight(int hourUtc, int minuteUtc, int expectedDay)
    {
        var day = expectedDay == 17 ? 17 : 18;
        var instant = new DateTime(2026, 9, day, hourUtc, minuteUtc, 0, DateTimeKind.Utc);
        Assert.Equal(new DateOnly(2026, 9, expectedDay), ReviewTime.UtcDate(instant));
    }

    [Theory]
    [InlineData(true, 22)]
    [InlineData(false, 19)]
    public void LateReviewSchedulesFromActualUtcAnswerDate(bool correct, int nextDay)
    {
        var answer = new DateTime(2026, 9, 18, 2, 0, 0, DateTimeKind.Utc);
        var result = correct ? FluentAsrsScheduler.ApplyCorrect(1, 0) : FluentAsrsScheduler.ApplyWrong(1, 0);
        Assert.Equal(new DateOnly(2026, 9, nextDay), ReviewTime.NextReviewDate(answer, result.IntervalDays));
    }

    [Fact]
    public void UtcDateBoundsSpanExactUtcCalendarDay()
    {
        var (start, end) = ReviewTime.UtcDateBounds(new DateTime(2026, 9, 18));
        Assert.Equal(new DateTime(2026, 9, 18, 0, 0, 0, DateTimeKind.Utc), start);
        Assert.Equal(new DateTime(2026, 9, 19, 0, 0, 0, DateTimeKind.Utc), end);
    }
}
