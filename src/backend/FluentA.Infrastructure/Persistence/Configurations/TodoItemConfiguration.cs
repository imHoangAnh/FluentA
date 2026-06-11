using FluentA.Domain.BoundedContexts.Todo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class TodoItemConfiguration : IEntityTypeConfiguration<TodoItem>
{
    public void Configure(EntityTypeBuilder<TodoItem> builder)
    {
        builder.ToTable("todo_items");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(item => item.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(item => item.Note).HasColumnName("note").HasMaxLength(4000);
        builder.Property(item => item.Date).HasColumnName("date").HasColumnType("date").IsRequired();
        builder.Property(item => item.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(item => item.CompletedAt).HasColumnName("completed_at");
        builder.Property(item => item.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(item => item.IsCarriedOver).HasColumnName("is_carried_over").IsRequired();
        builder.Property(item => item.OriginalDate).HasColumnName("original_date").HasColumnType("date");
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(item => new { item.UserId, item.Date });
        builder.HasIndex(item => new { item.UserId, item.IsCompleted, item.Date });
        builder.HasIndex(item => new { item.UserId, item.Date, item.SortOrder });
    }
}
