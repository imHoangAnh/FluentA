namespace FluentA.Domain.BoundedContexts.Review;

public static class ReviewMode
{
    public const string MeaningToWord = "meaningToWord";

    public static IReadOnlyList<string> All { get; } =
    [
        MeaningToWord,
    ];
}
