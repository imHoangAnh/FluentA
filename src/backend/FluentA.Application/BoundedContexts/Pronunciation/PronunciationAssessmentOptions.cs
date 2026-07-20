namespace FluentA.Application.BoundedContexts.Pronunciation;

public sealed record PronunciationAssessmentOptions(
    bool Enabled,
    string Region,
    string SubscriptionKey,
    int TimeoutSeconds,
    double AccuracyThreshold)
{
    public bool IsConfigured =>
        Enabled
        && !string.IsNullOrWhiteSpace(SubscriptionKey)
        && IsSafeRegion(Region)
        && TimeoutSeconds > 0
        && AccuracyThreshold is >= 0 and <= 100;

    private static bool IsSafeRegion(string value) =>
        !string.IsNullOrWhiteSpace(value)
        && value.All(character => char.IsAsciiLetterOrDigit(character) || character == '-');
}
