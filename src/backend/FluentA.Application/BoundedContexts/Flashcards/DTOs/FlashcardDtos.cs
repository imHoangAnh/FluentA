namespace FluentA.Application.BoundedContexts.Flashcards.DTOs;

public sealed record FlashcardCardDto(
    Guid Id,
    Guid WordId,
    string Word,
    string WordClass,
    string MeaningVn,
    string MeaningEn,
    string Example,
    string? Thesaurus,
    string? Collocation,
    string? Note,
    int Interval,
    float EaseFactor,
    int Repetitions,
    DateTime? NextReviewDate,
    string State);

public sealed record FlashcardDeckDto(
    Guid Id,
    Guid BoardId,
    string BoardName,
    string BoardLanguage,
    Guid? PageId,
    string Name,
    string Type,
    IReadOnlyList<FlashcardCardDto> Cards);

public sealed record DeckSessionDto(
    Guid DeckId,
    Guid BoardId,
    string DeckName,
    string DeckType,
    string BoardLanguage,
    IReadOnlyList<FlashcardCardDto> Cards);

public sealed record CreateReviewSessionRequest(Guid DeckId);

public sealed record ReviewSessionCreatedDto(
    Guid SessionId,
    Guid DeckId,
    string DeckName,
    string DeckType,
    int TotalCards);

public sealed record ReviewSessionSummaryDto(
    Guid SessionId,
    int TotalCardsReviewed,
    int Easy,
    int Good,
    int Hard,
    int Again,
    int EasyPercent,
    int GoodPercent,
    int HardPercent,
    int AgainPercent,
    int AverageTimeSpentSeconds);

public sealed record ReviewSettingsDto(int NewCardsPerDay, int ReviewCardsPerDay);

public sealed record UpdateReviewSettingsRequest(int NewCardsPerDay, int ReviewCardsPerDay);

public sealed record DueAllowanceDto(int Limit, int Consumed, int Remaining);

public sealed record DueCountsDto(int Overdue, int DueToday, int NewCards, int Total);

public sealed record DueDeckDto(
    Guid DeckId,
    Guid BoardId,
    string DeckName,
    string BoardLanguage,
    ReviewSettingsDto Settings,
    DueAllowanceDto NewCards,
    DueAllowanceDto Reviews,
    DueCountsDto Counts,
    IReadOnlyList<FlashcardCardDto> Cards);

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
    Guid CardId,
    int Rating,
    int TimeSpentSeconds,
    string TimeZoneId);

public sealed record ReviewResultDto(
    Guid CardId,
    Guid ReviewId,
    Guid BoardId,
    Guid DeckId,
    string DeckType,
    string Rating,
    int Interval,
    float EaseFactor,
    int Repetitions,
    DateTime? NextReviewDate,
    string State);
