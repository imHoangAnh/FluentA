using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class WordReviewStateConfiguration : IEntityTypeConfiguration<WordReviewState>
{
    public void Configure(EntityTypeBuilder<WordReviewState> builder)
    {
        builder.ToTable("word_review_states");

        builder.HasKey(state => state.Id);

        builder.Property(state => state.Id).HasColumnName("id");
        builder.Property(state => state.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(state => state.WordId).HasColumnName("word_id").IsRequired();
        builder.Property(state => state.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(state => state.Level).HasColumnName("level").IsRequired();
        builder.Property(state => state.NextReviewDate).HasColumnName("next_review_date").IsRequired();
        builder.Property(state => state.LapseCount).HasColumnName("lapse_count").IsRequired();
        builder.Property(state => state.LastReviewedAt).HasColumnName("last_reviewed_at");
        builder.Property(state => state.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(state => state.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(state => state.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<VocabWord>()
            .WithMany()
            .HasForeignKey(state => state.WordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(state => new { state.UserId, state.WordId }).IsUnique();
        builder.HasIndex(state => new { state.UserId, state.NextReviewDate })
            .HasFilter("deleted_at IS NULL");
    }
}
