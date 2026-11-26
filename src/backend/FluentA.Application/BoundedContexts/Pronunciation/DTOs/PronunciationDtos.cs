namespace FluentA.Application.BoundedContexts.Pronunciation.DTOs;

public sealed record PronunciationAssessmentDto(
    bool Correct,
    double AccuracyScore,
    double? CompletenessScore,
    string FeedbackMode,
    IReadOnlyList<PronunciationWordFeedbackDto> Words);

public sealed record PronunciationWordFeedbackDto(
    string Text,
    double AccuracyScore,
    string? ErrorType,
    IReadOnlyList<PronunciationUnitFeedbackDto> Units,
    IReadOnlyList<PronunciationSyllableFeedbackDto>? Syllables = null);

public sealed record PronunciationSyllableFeedbackDto(
    string Text,
    double AccuracyScore,
    IReadOnlyList<PronunciationUnitFeedbackDto> Phonemes);

public sealed record PronunciationUnitFeedbackDto(
    string Text,
    bool Correct,
    double? AccuracyScore = null);

public sealed record PronunciationTarget(string Word, string Language);
