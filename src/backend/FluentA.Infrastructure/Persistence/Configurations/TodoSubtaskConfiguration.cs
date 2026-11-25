using FluentA.Domain.BoundedContexts.Todo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class TodoSubtaskConfiguration : IEntityTypeConfiguration<TodoSubtask>
{
    public void Configure(EntityTypeBuilder<TodoSubtask> builder)
    {
        builder.ToTable("todo_subtasks");

        builder.HasKey(subtask => subtask.Id);

        builder.Property(subtask => subtask.Id).HasColumnName("id");
        builder.Property(subtask => subtask.TodoItemId).HasColumnName("todo_item_id").IsRequired();
        builder.Property(subtask => subtask.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(subtask => subtask.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(subtask => subtask.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(subtask => subtask.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(subtask => subtask.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(subtask => subtask.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(subtask => new { subtask.TodoItemId, subtask.SortOrder });
    }
}
