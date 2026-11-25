using System.Text.Json;
using FluentA.Application.BoundedContexts.Analytics;
using FluentA.Application.BoundedContexts.Analytics.DTOs;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.UnitTests;

public sealed class AnalyticsServiceTests
{
    // 2026-11-23 is Monday in UTC
    private static readonly DateTime FixedUtcNow = new(2026, 11, 23, 5, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("7d")]
    [InlineData("invalid")]
    public async Task GetLearningAnalyticsAsync_RejectsInvalidRangeParameter(string? range)
    {
        var service = new AnalyticsService(new FakeAnalyticsRepository(), () => FixedUtcNow);

        var result = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), range);

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
        Assert.Equal("VALIDATION_ERROR", result.Error!.Code);
        Assert.Equal(400, result.Error.StatusCode);
        var details = Assert.IsAssignableFrom<IReadOnlyDictionary<string, string[]>>(result.Error.Details);
        Assert.True(details.ContainsKey("range"));
    }

    [Fact]
    public async Task GetLearningAnalyticsAsync_ComputesRetentionAndDeltaPerRange()
    {
        // UTC today = 2026-11-23
        // 30d window: 2026-10-25 .. 2026-11-23
        // Prior 30d window: 2026-09-25 .. 2026-10-24
        var repo = new FakeAnalyticsRepository
        {
            Source = new LearningAnalyticsSourceData(
                ActiveReviewStates: [],
                ReviewHistories:
                [
                    // Current 30d: 4 correct, 1 wrong => 80.0%
                    new(UtcDay(2026, 11, 23, 9), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 11, 20, 9), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 11, 10, 9), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 10, 26, 9), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 10, 25, 9), FluentAsrsReviewResult.Wrong),
                    // Prior 30d: 1 correct, 1 wrong => 50.0% (delta +30.0)
                    new(UtcDay(2026, 10, 24, 9), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 9, 26, 9), FluentAsrsReviewResult.Wrong),
                    // Older than 60d (within 90d current window): 1 correct => 90d total 6/8 = 75.0%
                    new(UtcDay(2026, 9, 10, 9), FluentAsrsReviewResult.Correct),
                ],
                PracticeActivityTimestampsUtc: [],
                RecentPronunciationAttempts: []),
        };
        var service = new AnalyticsService(repo, () => FixedUtcNow);

        var res30 = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), "30d");
        var res90 = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), null);
        var resAll = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), "ALL");

        Assert.True(res30.IsSuccess);
        Assert.Equal("30d", res30.Value!.Range);
        Assert.Equal(80.0, res30.Value.Retention.RatePercent);
        Assert.Equal(30.0, res30.Value.Retention.DeltaPercent);
        Assert.Equal(5, res30.Value.Retention.TotalReviews);
        Assert.Equal(4, res30.Value.Retention.CorrectReviews);
        Assert.Equal(30, res30.Value.Retention.PriorPeriodDays);

        Assert.True(res90.IsSuccess);
        Assert.Equal("90d", res90.Value!.Range);
        Assert.Equal(75.0, res90.Value.Retention.RatePercent);
        Assert.Null(res90.Value.Retention.DeltaPercent); // no prior 90d reviews

        Assert.True(resAll.IsSuccess);
        Assert.Equal("all", resAll.Value!.Range);
        Assert.Equal(75.0, resAll.Value.Retention.RatePercent);
        Assert.Null(resAll.Value.Retention.DeltaPercent);
        Assert.Null(resAll.Value.Retention.PriorPeriodDays);
    }

    [Fact]
    public async Task GetLearningAnalyticsAsync_ComputesMasteryAndDynamicSevenDayForecast()
    {
        var today = new DateOnly(2026, 11, 23); // Monday
        var repo = new FakeAnalyticsRepository
        {
            Source = new LearningAnalyticsSourceData(
                ActiveReviewStates:
                [
                    new(0, today.AddDays(-2)), // overdue -> Today
                    new(1, today),             // Today
                    new(2, today.AddDays(1)),  // Tomorrow
                    new(3, today.AddDays(2)),  // Wed – Fri
                    new(4, today.AddDays(4)),  // Wed – Fri
                    new(4, today.AddDays(5)),  // Weekend (Sat)
                    new(5, today.AddDays(6)),  // Weekend (Sun)
                    new(5, today.AddDays(10)), // Outside 7d forecast
                ],
                ReviewHistories: [],
                PracticeActivityTimestampsUtc: [],
                RecentPronunciationAttempts: []),
        };
        var service = new AnalyticsService(repo, () => FixedUtcNow);

        var result = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), "90d");

        Assert.True(result.IsSuccess);
        var dto = result.Value!;

        Assert.Equal(8, dto.Mastery.TotalWords);
        Assert.Equal(4, dto.Mastery.MasteredCount); // Lv 4 (2) + Lv 5 (2)
        Assert.Equal(50, dto.Mastery.MasteredPercent);
        Assert.Equal([1, 1, 1, 1, 2, 2], dto.Mastery.Levels.Select(l => l.Count).ToArray());

        Assert.Equal(7, dto.Forecast.TotalDueNext7Days);
        Assert.Equal(1.0, dto.Forecast.AveragePerDay);
        Assert.Equal(4, dto.Forecast.Buckets.Count);
        Assert.Equal(("Today", 2), (dto.Forecast.Buckets[0].Label, dto.Forecast.Buckets[0].DueCount));
        Assert.Equal(("Tomorrow", 1), (dto.Forecast.Buckets[1].Label, dto.Forecast.Buckets[1].DueCount));
        Assert.Equal(("Wed – Fri", 2), (dto.Forecast.Buckets[2].Label, dto.Forecast.Buckets[2].DueCount));
        Assert.Equal(("Weekend", 2), (dto.Forecast.Buckets[3].Label, dto.Forecast.Buckets[3].DueCount));
    }

    [Fact]
    public async Task GetLearningAnalyticsAsync_FormatsNonMondayForecastLabelsDynamically()
    {
        // 2026-11-25 is Wednesday
        var wednesdayUtc = new DateTime(2026, 11, 25, 5, 0, 0, DateTimeKind.Utc);
        var service = new AnalyticsService(new FakeAnalyticsRepository(), () => wednesdayUtc);

        var result = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), "90d");

        Assert.True(result.IsSuccess);
        var buckets = result.Value!.Forecast.Buckets;
        Assert.Equal(["Today", "Tomorrow", "Fri – Sun", "Mon – Tue"], buckets.Select(b => b.Label).ToArray());
    }

    [Fact]
    public async Task GetLearningAnalyticsAsync_ComputesCombinedStreakAnd84DayConsistency()
    {
        // Active on 2026-11-22 (Review) and 2026-11-21 (Practice) => current streak 2 even before studying today
        // Older streak: 2026-11-01 .. 2026-11-04 => longest streak 4
        var repo = new FakeAnalyticsRepository
        {
            Source = new LearningAnalyticsSourceData(
                ActiveReviewStates: [],
                ReviewHistories:
                [
                    new(UtcDay(2026, 11, 22, 10), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 11, 1, 10), FluentAsrsReviewResult.Correct),
                    new(UtcDay(2026, 11, 2, 10), FluentAsrsReviewResult.Correct),
                ],
                PracticeActivityTimestampsUtc:
                [
                    UtcDay(2026, 11, 21, 18),
                    UtcDay(2026, 11, 3, 18),
                    UtcDay(2026, 11, 4, 18),
                    // 5 activities on 2026-11-10 -> intensity level 2
                    UtcDay(2026, 11, 10, 8),
                    UtcDay(2026, 11, 10, 9),
                    UtcDay(2026, 11, 10, 10),
                    UtcDay(2026, 11, 10, 11),
                    UtcDay(2026, 11, 10, 12),
                ],
                RecentPronunciationAttempts: []),
        };
        var service = new AnalyticsService(repo, () => FixedUtcNow);

        var result = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), "90d");

        Assert.True(result.IsSuccess);
        var dto = result.Value!;
        Assert.Equal(2, dto.Streak.CurrentDays);
        Assert.Equal(4, dto.Streak.LongestDays);
        Assert.Equal(84, dto.ConsistencyDays.Count);
        Assert.Equal(new DateOnly(2026, 11, 23), dto.ConsistencyDays[^1].Date);
        Assert.Equal(new DateOnly(2026, 9, 1), dto.ConsistencyDays[0].Date);

        var nov10 = dto.ConsistencyDays.Single(d => d.Date == new DateOnly(2026, 11, 10));
        Assert.Equal(5, nov10.ActivityCount);
        Assert.Equal(2, nov10.IntensityLevel);
    }

    [Fact]
    public async Task GetLearningAnalyticsAsync_AggregatesWeakPhonemesWithoutDoubleCounting()
    {
        var syllableAssessment = new PronunciationAssessmentDto(
            Correct: false,
            AccuracyScore: 62,
            CompletenessScore: 100,
            FeedbackMode: "syllable",
            Words:
            [
                new PronunciationWordFeedbackDto(
                    Text: "think",
                    AccuracyScore: 62,
                    ErrorType: null,
                    Units:
                    [
                        new PronunciationUnitFeedbackDto("th", false, 50),
                        new PronunciationUnitFeedbackDto("ih", true, 90),
                    ],
                    Syllables:
                    [
                        new PronunciationSyllableFeedbackDto(
                            Text: "think",
                            AccuracyScore: 62,
                            Phonemes:
                            [
                                new PronunciationUnitFeedbackDto("th", false, 50),
                                new PronunciationUnitFeedbackDto("ih", true, 90),
                            ]),
                    ]),
            ]);

        var phonemeModeAssessment = new PronunciationAssessmentDto(
            Correct: false,
            AccuracyScore: 70,
            CompletenessScore: 100,
            FeedbackMode: "phoneme",
            Words:
            [
                new PronunciationWordFeedbackDto(
                    Text: "gate",
                    AccuracyScore: 70,
                    ErrorType: null,
                    Units:
                    [
                        new PronunciationUnitFeedbackDto("ei", false, 54),
                        new PronunciationUnitFeedbackDto("th", false, 70),
                        new PronunciationUnitFeedbackDto("dh", false, 66),
                        new PronunciationUnitFeedbackDto("r", true, 74),
                        new PronunciationUnitFeedbackDto("k", true, 95),
                    ],
                    Syllables: null),
            ]);

        var repo = new FakeAnalyticsRepository
        {
            Source = new LearningAnalyticsSourceData(
                ActiveReviewStates: [],
                ReviewHistories: [],
                PracticeActivityTimestampsUtc: [],
                RecentPronunciationAttempts:
                [
                    new("think", JsonSerializer.Serialize(syllableAssessment), FixedUtcNow.AddMinutes(-1)),
                    new("gate", JsonSerializer.Serialize(phonemeModeAssessment), FixedUtcNow.AddMinutes(-2)),
                    new("broken", "{invalid-json", FixedUtcNow.AddMinutes(-3)),
                ]),
        };
        var service = new AnalyticsService(repo, () => FixedUtcNow);

        var result = await service.GetLearningAnalyticsAsync(Guid.NewGuid(), "90d");

        Assert.True(result.IsSuccess);
        var phonemes = result.Value!.WeakPhonemes;
        Assert.Equal(4, phonemes.Count);
        Assert.Equal(["/ei/", "/th/", "/dh/", "/r/"], phonemes.Select(p => p.Phoneme).ToArray());

        var th = phonemes.Single(p => p.Phoneme == "/th/");
        Assert.Equal(60, th.AccuracyPercent); // (50 + 70) / 2, NOT (50 + 50 + 70) / 3
        Assert.Equal(2, th.AttemptCount);
        Assert.Equal(["think", "gate"], th.ExampleWords);
    }

    private static DateTime UtcDay(int year, int month, int day, int hour) =>
        new(year, month, day, hour, 0, 0, DateTimeKind.Utc);

    private sealed class FakeAnalyticsRepository : IAnalyticsRepository
    {
        public LearningAnalyticsSourceData Source { get; init; } = new([], [], [], []);

        public Task<LearningAnalyticsSourceData> GetLearningAnalyticsSourceAsync(
            Guid userId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(Source);
    }
}
