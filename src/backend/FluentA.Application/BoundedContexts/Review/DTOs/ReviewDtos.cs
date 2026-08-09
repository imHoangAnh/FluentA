namespace FluentA.Application.BoundedContexts.Review.DTOs;

public sealed record ReviewSessionWordDto(
    Guid WordId,
    string Word,
    string WordClass,
    string IpaPronunciation,
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
    DateTime StartedAt,
    int TotalWords,
    IReadOnlyList<ReviewSessionWordDto> Words);

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
    DateOnly NextReviewDate);

public sealed record LevelFiveReviewItemDto(
    Guid WordId,
    string Word,
    Guid BoardId,
    string BoardName,
    Guid PageId,
    string PageName,
    string Status,
    DateOnly? LastReviewDate);

public sealed record RemoveLevelFiveWordsRequest(IReadOnlyList<Guid> WordIds);
