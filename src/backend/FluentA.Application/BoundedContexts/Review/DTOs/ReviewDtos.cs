namespace FluentA.Application.BoundedContexts.Review.DTOs;

public sealed record ReviewDashboardDto(
    DateOnly LocalDate,
    int DueCount);

public sealed record ReviewSessionDto(
    Guid SessionId,
    DateOnly LocalDate,
    DateTime StartedAt,
    DateTime? CompletedAt,
    string Status,
    int TotalWords,
    int CompletedWords,
    int? CurrentItemIndex,
    IReadOnlyList<ReviewSessionItemDto> Items);

public sealed record ReviewSessionItemDto(
    Guid ItemId,
    Guid WordId,
    int Position,
    string Mode,
    string Language,
    string Word,
    string Meaning,
    string IpaPronunciation,
    string Type,
    string? Context,
    string Example,
    string? Synonyms,
    string? Antonyms,
    bool IsReviewed,
    string? Result,
    int? LevelBefore,
    int? LevelAfter,
    DateOnly? NextReviewDateBefore,
    DateOnly? NextReviewDateAfter);

public sealed record SubmitReviewAnswerRequest(
    Guid ItemId,
    string AnswerText,
    int TimeSpentSeconds);

public sealed record ReviewAnswerTargetDto(
    Guid WordId,
    string Mode,
    string ExpectedAnswer,
    string Language);

public sealed record ReviewAnswerResultDto(
    Guid ItemId,
    Guid WordId,
    bool Correct,
    bool IsReviewed,
    string? Result,
    int? LevelBefore,
    int? LevelAfter,
    DateOnly? NextReviewDateBefore,
    DateOnly? NextReviewDateAfter,
    int CompletedWords,
    int? CurrentItemIndex,
    string SessionStatus);
