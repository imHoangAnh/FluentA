namespace FluentA.Application.BoundedContexts.Pronunciation.DTOs;

public sealed record PronunciationAssessmentDto(bool Correct);

public sealed record PronunciationTarget(string Word, string Language);
