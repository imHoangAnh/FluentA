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
