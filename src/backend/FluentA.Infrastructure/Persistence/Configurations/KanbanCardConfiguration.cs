using FluentA.Domain.BoundedContexts.Kanban.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class KanbanCardConfiguration : IEntityTypeConfiguration<KanbanCard>
{
    public void Configure(EntityTypeBuilder<KanbanCard> builder)
    {
        builder.ToTable("kanban_cards");

        builder.HasKey(card => card.Id);

        builder.Property(card => card.Id).HasColumnName("id");
        builder.Property(card => card.ColumnId).HasColumnName("column_id").IsRequired();
        builder.Property(card => card.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(card => card.Description).HasColumnName("description").HasMaxLength(4000);
        builder.Property(card => card.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(card => card.Deadline).HasColumnName("deadline").HasColumnType("date");
        builder.Property(card => card.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(card => card.Tags).HasColumnName("tags").HasColumnType("text[]").IsRequired();
        builder.Property(card => card.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(card => card.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(card => card.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(card => new { card.ColumnId, card.DeletedAt, card.SortOrder });
        builder.HasIndex(card => card.Deadline);
    }
}
