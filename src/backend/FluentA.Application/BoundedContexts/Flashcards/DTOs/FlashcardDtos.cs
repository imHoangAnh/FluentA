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
    int? ReviewLevel,
    DateTime? NextReviewDate,
    int LapseCount);

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

public sealed record CreatePracticeSessionSummaryRequest(
    Guid DeckId,
    string Mode,
    int TotalCards,
    int CorrectCards,
    int WrongCards,
    string TimeZoneId);

public sealed record AddPracticeWordsToReviewRequest(
    Guid DeckId,
    string TimeZoneId);

public sealed record AddPracticeWordsToReviewDto(
    Guid DeckId,
    int AddedWordCount,
    DateTime NextReviewDate);

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

public sealed record PracticeSessionSummaryDto(
    Guid Id,
    Guid UserId,
    Guid DeckId,
    string Mode,
    int TotalCards,
    int CorrectCards,
    int WrongCards,
    DateTime CompletedAt);

public sealed record PracticeSettingsDto(IReadOnlyList<string> ModeSequence);

public sealed record UpdatePracticeSettingsRequest(IReadOnlyList<string> ModeSequence);

public enum PracticeSessionSummarySaveStatus
{
    Success = 0,
    DeckNotFound = 1,
    InconsistentSummary = 2,
}

public sealed record PracticeSessionSummarySaveResult(
    PracticeSessionSummarySaveStatus Status,
    PracticeSessionSummaryDto? Summary);

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
