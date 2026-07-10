using FluentA.Domain.BoundedContexts.Note.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class NotePageConfiguration : IEntityTypeConfiguration<NotePage>
{
    public void Configure(EntityTypeBuilder<NotePage> builder)
    {
        builder.ToTable("note_pages");

        builder.HasKey(page => page.Id);

        builder.Property(page => page.Id).HasColumnName("id");
        builder.Property(page => page.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(page => page.Name).HasColumnName("name").HasMaxLength(240).IsRequired();
        builder.Property(page => page.Content).HasColumnName("content").HasColumnType("text").IsRequired();
        builder.Property(page => page.Date).HasColumnName("date").HasColumnType("date").IsRequired();
        builder.Property(page => page.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(page => page.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(page => page.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(page => new { page.BoardId, page.CreatedAt });
    }
}
