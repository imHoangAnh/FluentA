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
    IReadOnlyList<PronunciationUnitFeedbackDto> Units);

public sealed record PronunciationUnitFeedbackDto(
    string Text,
    bool Correct);

public sealed record PronunciationTarget(string Word, string Language);
