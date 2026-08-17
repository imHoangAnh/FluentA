using System.Text.Json;
using FluentA.Application.BoundedContexts.Pronunciation;

namespace FluentA.Infrastructure.Pronunciation;

internal static class AzurePronunciationResponseParser
{
    public static bool TryReadUnit(JsonElement element, out PronunciationUnitAssessment unit)
    {
        unit = default!;
        if (!element.TryGetProperty("Phoneme", out var phonemeText)
            || phonemeText.ValueKind != JsonValueKind.String
            || string.IsNullOrWhiteSpace(phonemeText.GetString()))
        {
            return false;
        }

        var assessment = GetAssessmentElement(element);
        if (!TryReadScore(assessment, "AccuracyScore", out var score))
        {
            return false;
        }

        unit = new PronunciationUnitAssessment(phonemeText.GetString()!, score);
        return true;
    }
    public static JsonElement GetAssessmentElement(JsonElement element) =>
        element.TryGetProperty("PronunciationAssessment", out var nested)
        && nested.ValueKind == JsonValueKind.Object
            ? nested
            : element;

    public static string GetPropertyNames(JsonElement element) =>
        element.ValueKind == JsonValueKind.Object
            ? string.Join(',', element.EnumerateObject().Select(property => property.Name))
            : $"<{element.ValueKind}>";

    public static bool TryReadScore(JsonElement parent, string propertyName, out double score)
    {
        score = 0;
        return parent.TryGetProperty(propertyName, out var property)
            && property.TryGetDouble(out score)
            && double.IsFinite(score)
            && score is >= 0 and <= 100;
    }
    public sealed class InvalidAssessmentResponseException : Exception
    {
        public InvalidAssessmentResponseException(string message) : base(message) { }
    }
}
