using FluentA.Application.BoundedContexts.Review;
using FluentA.Domain.BoundedContexts.Review;

namespace FluentA.Application.UnitTests;

public sealed class VietnamReviewTimeTests
{
    private static readonly TimeZoneInfo Vietnam = TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh");

    [Theory]
    [InlineData(16, 59, 17)]
    [InlineData(17, 0, 18)]
    public void ReviewCalendarChangesAtVietnamMidnight(int hourUtc, int minuteUtc, int expectedDay)
    {
        var instant = new DateTime(2026, 9, 17, hourUtc, minuteUtc, 0, DateTimeKind.Utc);
        Assert.Equal(new DateOnly(2026, 9, expectedDay), ReviewTime.LocalDate(instant, Vietnam));
    }

    [Theory]
    [InlineData(true, 22)]
    [InlineData(false, 19)]
    public void LateReviewSchedulesFromActualAnswerDate(bool correct, int nextDay)
    {
        // A level-one word due on September 15 is answered on September 18.
        var answer = new DateTime(2026, 9, 18, 2, 0, 0, DateTimeKind.Utc);
        var result = correct ? FluentAsrsScheduler.ApplyCorrect(1, 0) : FluentAsrsScheduler.ApplyWrong(1, 0);
        Assert.Equal(new DateOnly(2026, 9, nextDay), ReviewTime.NextReviewDate(answer, result.IntervalDays, Vietnam));
    }

    [Fact]
    public void VietnamDayBoundsAreUtcInstantsWithoutShiftingDateOnlyValues()
    {
        var (start, end) = ReviewTime.LocalDateBoundsUtc(new DateTime(2026, 9, 18), Vietnam);
        Assert.Equal(new DateTime(2026, 9, 17, 17, 0, 0, DateTimeKind.Utc), start);
        Assert.Equal(new DateTime(2026, 9, 18, 17, 0, 0, DateTimeKind.Utc), end);
    }
}
