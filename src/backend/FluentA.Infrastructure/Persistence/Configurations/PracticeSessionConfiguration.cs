using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PracticeSessionConfiguration : IEntityTypeConfiguration<PracticeSession>
{
    public void Configure(EntityTypeBuilder<PracticeSession> builder)
    {
        builder.ToTable("practice_sessions");
        builder.HasKey(session => session.Id);

        builder.Property(session => session.Id).HasColumnName("id");
        builder.Property(session => session.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(session => session.PageId).HasColumnName("page_id").IsRequired();
        builder.Property(session => session.PageName).HasColumnName("page_name").HasMaxLength(120).IsRequired();
        builder.Property(session => session.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(session => session.BoardName).HasColumnName("board_name").HasMaxLength(120).IsRequired();
        builder.Property(session => session.BoardLanguage).HasColumnName("board_language").HasMaxLength(8).IsRequired();
        builder.Property(session => session.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(session => session.CurrentItemIndex).HasColumnName("current_item_index").IsRequired();
        builder.Property(session => session.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(session => session.CompletedAt).HasColumnName("completed_at");
        builder.Property(session => session.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(session => session.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(session => session.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(session => session.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<VocabPage>()
            .WithMany()
            .HasForeignKey(session => session.PageId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<VocabBoard>()
            .WithMany()
            .HasForeignKey(session => session.BoardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(session => new { session.UserId, session.StartedAt });
        builder.HasIndex(session => new { session.PageId, session.StartedAt });
    }
}
