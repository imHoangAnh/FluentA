using System.Text.Json;
using FluentA.Application.BoundedContexts.Pronunciation;

namespace FluentA.Infrastructure.ExternalServices.Pronunciation;

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

        if (!TryReadTiming(element, out var offset, out var duration)) return false;
        unit = new PronunciationUnitAssessment(phonemeText.GetString()!, score, offset, duration);
        return true;
    }

    public static bool TryReadWordDetails(
        JsonElement word,
        out IReadOnlyList<PronunciationUnitAssessment> units,
        out IReadOnlyList<PronunciationSyllableAssessment> syllables)
    {
        var wordUnits = new List<PronunciationUnitAssessment>();
        var wordSyllables = new List<PronunciationSyllableAssessment>();
        units = wordUnits;
        syllables = wordSyllables;
        if (!TryReadPhonemes(word, wordUnits)) return false;
        var hasDirectPhonemes = wordUnits.Count > 0;
        if (!word.TryGetProperty("Syllables", out var elements)) return true;
        if (elements.ValueKind != JsonValueKind.Array) return false;

        foreach (var element in elements.EnumerateArray())
        {
            var nestedUnits = new List<PronunciationUnitAssessment>();
            if (!TryReadPhonemes(element, nestedUnits)) return false;
            if (!hasDirectPhonemes) wordUnits.AddRange(nestedUnits);

            // Older responses may only wrap phonemes without syllable details.
            if (!element.TryGetProperty("Syllable", out var text)) continue;
            if (text.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(text.GetString())
                || !TryReadScore(GetAssessmentElement(element), "AccuracyScore", out var score)
                || !TryReadTiming(element, out var offset, out var duration)) return false;

            IReadOnlyList<PronunciationUnitAssessment> phonemes = nestedUnits;
            if (nestedUnits.Count == 0 && offset is not null && duration is not null)
            {
                // Provider timestamps are absolute within the recording. Matching by
                // start time avoids assigning a boundary phoneme to two syllables.
                phonemes = wordUnits.Where(unit => unit.Offset is not null
                    && unit.Offset >= offset && unit.Offset.Value - offset.Value < duration.Value).ToArray();
            }

            wordSyllables.Add(new PronunciationSyllableAssessment(text.GetString()!, score, phonemes));
        }

        return true;
    }

    private static bool TryReadPhonemes(JsonElement element, List<PronunciationUnitAssessment> units)
    {
        if (!element.TryGetProperty("Phonemes", out var phonemes)) return true;
        if (phonemes.ValueKind != JsonValueKind.Array) return false;
        foreach (var phoneme in phonemes.EnumerateArray())
        {
            if (!TryReadUnit(phoneme, out var unit)) return false;
            units.Add(unit);
        }
        return true;
    }

    private static bool TryReadTiming(JsonElement element, out long? offset, out long? duration)
    {
        offset = null;
        duration = null;
        if (element.TryGetProperty("Offset", out var offsetElement))
        {
            if (offsetElement.ValueKind != JsonValueKind.Number || !offsetElement.TryGetInt64(out var parsedOffset) || parsedOffset < 0) return false;
            offset = parsedOffset;
        }
        if (element.TryGetProperty("Duration", out var durationElement))
        {
            if (durationElement.ValueKind != JsonValueKind.Number || !durationElement.TryGetInt64(out var parsedDuration) || parsedDuration <= 0) return false;
            duration = parsedDuration;
        }
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
            && property.ValueKind == JsonValueKind.Number
            && property.TryGetDouble(out score)
            && double.IsFinite(score)
            && score is >= 0 and <= 100;
    }
    public sealed class InvalidAssessmentResponseException : Exception
    {
        public InvalidAssessmentResponseException(string message) : base(message) { }
    }
}
