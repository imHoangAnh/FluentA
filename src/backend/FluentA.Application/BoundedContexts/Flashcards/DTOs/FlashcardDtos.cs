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
