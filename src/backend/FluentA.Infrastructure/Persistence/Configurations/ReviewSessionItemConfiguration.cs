using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ReviewSessionItemConfiguration : IEntityTypeConfiguration<ReviewSessionItem>
{
    public void Configure(EntityTypeBuilder<ReviewSessionItem> builder)
    {
        builder.ToTable("review_session_items");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.ReviewSessionId).HasColumnName("review_session_id").IsRequired();
        builder.Property(item => item.VocabWordId).HasColumnName("vocab_word_id").IsRequired();
        builder.Property(item => item.IsReviewed).HasColumnName("is_reviewed").IsRequired();
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<ReviewSession>()
            .WithMany()
            .HasForeignKey(item => item.ReviewSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<VocabWord>()
            .WithMany()
            .HasForeignKey(item => item.VocabWordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(item => new { item.ReviewSessionId, item.VocabWordId })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
