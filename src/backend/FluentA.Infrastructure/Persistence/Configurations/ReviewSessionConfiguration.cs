using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ReviewSessionConfiguration : IEntityTypeConfiguration<ReviewSession>
{
    public void Configure(EntityTypeBuilder<ReviewSession> builder)
    {
        builder.ToTable("review_sessions");

        builder.HasKey(session => session.Id);

        builder.Property(session => session.Id).HasColumnName("id");
        builder.Property(session => session.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(session => session.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(session => session.OrderType).HasColumnName("order_type").HasMaxLength(20).IsRequired();
        builder.Property(session => session.SessionDate).HasColumnName("session_date").IsRequired();
        builder.Property(session => session.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(session => session.CompletedAt).HasColumnName("completed_at");
        builder.Property(session => session.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(session => session.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(session => session.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(session => session.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(session => session.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<VocabBoard>()
            .WithMany()
            .HasForeignKey(session => session.BoardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(session => new { session.UserId, session.BoardId, session.SessionDate, session.Status })
            .HasFilter("deleted_at IS NULL");
    }
}
