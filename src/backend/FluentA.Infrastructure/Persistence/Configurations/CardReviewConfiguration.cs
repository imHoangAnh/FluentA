using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class CardReviewConfiguration : IEntityTypeConfiguration<CardReview>
{
    public void Configure(EntityTypeBuilder<CardReview> builder)
    {
        builder.ToTable("card_reviews");

        builder.HasKey(review => review.Id);

        builder.Property(review => review.Id).HasColumnName("id");
        builder.Property(review => review.CardId).HasColumnName("card_id").IsRequired();
        builder.Property(review => review.SessionId).HasColumnName("session_id").IsRequired();
        builder.Property(review => review.Rating).HasColumnName("rating").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(review => review.TimeSpentSeconds).HasColumnName("time_spent_seconds").IsRequired();
        builder.Property(review => review.ReviewedAt).HasColumnName("reviewed_at").IsRequired();
        builder.Property(review => review.IntervalAfter).HasColumnName("interval_after").IsRequired();
        builder.Property(review => review.EaseFactorAfter).HasColumnName("ease_factor_after").IsRequired();
        builder.Property(review => review.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(review => review.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(review => review.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<FlashcardCard>()
            .WithMany()
            .HasForeignKey(review => review.CardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(review => new { review.CardId, review.ReviewedAt });
        builder.HasIndex(review => review.SessionId);
    }
}
