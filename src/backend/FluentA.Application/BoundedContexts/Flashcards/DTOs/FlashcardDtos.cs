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
    bool IsInReview,
    int? ReviewLevel,
    DateTime? NextReviewDate,
    int LapseCount);

public sealed record FlashcardPageDto(
    Guid PageId,
    string PageName,
    bool IsPracticed,
    IReadOnlyList<FlashcardCardDto> Words);

public sealed record FlashcardBoardDto(
    Guid BoardId,
    string BoardName,
    string BoardLanguage,
    IReadOnlyList<FlashcardPageDto> Pages);

public sealed record PageSessionDto(
    Guid PageId,
    Guid BoardId,
    string PageName,
    string BoardLanguage,
    IReadOnlyList<FlashcardCardDto> Words);
