using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Review.Entities;

public sealed class ReviewSessionItem : BaseEntity
{
    private ReviewSessionItem()
    {
    }

    private ReviewSessionItem(Guid reviewSessionId, Guid vocabWordId, bool isReviewed)
    {
        if (reviewSessionId == Guid.Empty || vocabWordId == Guid.Empty)
        {
            throw new ArgumentException("Session id and word id are required.");
        }

        ReviewSessionId = reviewSessionId;
        VocabWordId = vocabWordId;
        IsReviewed = isReviewed;
    }

    public Guid ReviewSessionId { get; private set; }
    public Guid VocabWordId { get; private set; }
    public bool IsReviewed { get; private set; }

    public static ReviewSessionItem Create(Guid reviewSessionId, Guid vocabWordId) =>
        new(reviewSessionId, vocabWordId, false);

    public void MarkReviewed()
    {
        IsReviewed = true;
        UpdatedAt = DateTime.UtcNow;
    }
}
