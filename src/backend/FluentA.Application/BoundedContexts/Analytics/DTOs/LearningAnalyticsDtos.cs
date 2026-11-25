using FluentA.Domain.BoundedContexts.Review.Entities;

namespace FluentA.Application.BoundedContexts.Analytics.DTOs;

public sealed record LearningAnalyticsDto(
    string Range,
    DateOnly LocalDate,
    RetentionMetricDto Retention,
    MasteryMetricDto Mastery,
    StudyStreakDto Streak,
    ReviewForecastDto Forecast,
    IReadOnlyList<StudyConsistencyDayDto> ConsistencyDays,
    IReadOnlyList<WeakPhonemeDto> WeakPhonemes);

public sealed record RetentionMetricDto(
    double? RatePercent,
    double? DeltaPercent,
    int TotalReviews,
    int CorrectReviews,
    int? PriorPeriodDays);

public sealed record MasteryMetricDto(
    int MasteredCount,
    int TotalWords,
    int MasteredPercent,
    IReadOnlyList<MasteryLevelCountDto> Levels);

public sealed record MasteryLevelCountDto(int Level, int Count);

public sealed record StudyStreakDto(int CurrentDays, int LongestDays);

public sealed record ReviewForecastDto(
    int TotalDueNext7Days,
    double AveragePerDay,
    IReadOnlyList<ReviewForecastBucketDto> Buckets);

public sealed record ReviewForecastBucketDto(
    string Key,
    string Label,
    DateOnly StartDate,
    DateOnly EndDate,
    int DueCount);

public sealed record StudyConsistencyDayDto(
    DateOnly Date,
    int ActivityCount,
    int IntensityLevel);

public sealed record WeakPhonemeDto(
    string Phoneme,
    IReadOnlyList<string> ExampleWords,
    int AccuracyPercent,
    int AttemptCount);

public sealed record LearningAnalyticsSourceData(
    IReadOnlyList<ActiveReviewStateSnapshot> ActiveReviewStates,
    IReadOnlyList<ReviewHistorySnapshot> ReviewHistories,
    IReadOnlyList<DateTime> PracticeActivityTimestampsUtc,
    IReadOnlyList<PronunciationAttemptSnapshot> RecentPronunciationAttempts);

public sealed record ActiveReviewStateSnapshot(int Level, DateOnly NextReviewDate);

public sealed record ReviewHistorySnapshot(DateTime ReviewedAtUtc, FluentAsrsReviewResult Result);

public sealed record PronunciationAttemptSnapshot(string Word, string AssessmentJson, DateTime CreatedAtUtc);
