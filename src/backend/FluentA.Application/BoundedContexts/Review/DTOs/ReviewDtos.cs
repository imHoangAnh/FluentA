namespace FluentA.Application.BoundedContexts.Review.DTOs;

public sealed record ReviewSessionWordDto(
    Guid WordId,
    string Word,
    string WordClass,
    string MeaningVn,
    string MeaningEn,
    string Example,
    string? Thesaurus,
    string? Collocation,
    string? Note,
    string Mode);

public sealed record CreateReviewSessionRequest(
    Guid BoardId,
    string OrderType,
    string Mode,
    string TimeZoneId);

public sealed record ReviewSessionCreatedDto(
    Guid SessionId,
    Guid BoardId,
    string BoardName,
    string OrderType,
    string Mode,
    int TotalWords,
    IReadOnlyList<ReviewSessionWordDto> Words);

public sealed record ReviewSessionSummaryDto(
    Guid SessionId,
    int TotalWordsReviewed,
    int Correct,
    int Wrong,
    int CorrectPercent,
    int WrongPercent,
    int AverageTimeSpentSeconds);

public sealed record ReviewSettingsDto(int DailyLimit, bool RecapAfterAnswer);

public sealed record UpdateReviewSettingsRequest(int DailyLimit, bool RecapAfterAnswer);

public sealed record DashboardForecastPointDto(string Date, int DueCount);

public sealed record FlashcardDashboardDto(
    Guid? BoardId,
    string? BoardName,
    int TotalCards,
    int TotalReviews,
    int StreakDays,
    int RetentionRate,
    int Overdue,
    int DueToday,
    int NewCards,
    IReadOnlyList<DashboardForecastPointDto> Forecast);

public sealed record SubmitReviewRequest(
    Guid SessionId,
    Guid WordId,
    bool Correct,
    int TimeSpentSeconds,
    string TimeZoneId);

public sealed record ReviewResultDto(
    Guid WordId,
    Guid ReviewHistoryId,
    string Result,
    int LevelBefore,
    int LevelAfter,
    int LapseCount,
    DateTime NextReviewDate);
