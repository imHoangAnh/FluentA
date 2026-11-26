namespace FluentA.Domain.BoundedContexts.Review;

public static class ReviewMode
{
    public const string Dictation = "dictation";
    public const string MeaningToWord = "meaningToWord";
    public const string ListenAndRepeat = "listenAndRepeat";

    public static IReadOnlyList<string> All { get; } =
    [
        Dictation,
        MeaningToWord,
        ListenAndRepeat,
    ];
}
