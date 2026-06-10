using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabColumnVisibilityConfiguration : IEntityTypeConfiguration<VocabColumnVisibility>
{
    public void Configure(EntityTypeBuilder<VocabColumnVisibility> builder)
    {
        builder.ToTable("vocab_column_visibility");
        builder.HasKey(preference => preference.Id);
        builder.Property(preference => preference.Id).HasColumnName("id");
        builder.Property(preference => preference.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(preference => preference.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(preference => preference.ColumnKey).HasColumnName("column_key").HasMaxLength(80).IsRequired();
        builder.Property(preference => preference.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(preference => preference.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(preference => preference.DeletedAt).HasColumnName("deleted_at");
        builder.HasOne<User>().WithMany().HasForeignKey(preference => preference.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<VocabBoard>().WithMany().HasForeignKey(preference => preference.BoardId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(preference => new { preference.UserId, preference.BoardId, preference.ColumnKey }).IsUnique();
    }
}
