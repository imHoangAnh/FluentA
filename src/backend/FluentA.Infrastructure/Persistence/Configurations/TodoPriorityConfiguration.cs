using FluentA.Domain.BoundedContexts.Todo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class TodoPriorityConfiguration : IEntityTypeConfiguration<TodoPriority>
{
    public void Configure(EntityTypeBuilder<TodoPriority> builder)
    {
        builder.ToTable("todo_priorities");

        builder.HasKey(priority => priority.Id);

        builder.Property(priority => priority.Id).HasColumnName("id");
        builder.Property(priority => priority.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(priority => priority.Name).HasColumnName("name").HasMaxLength(40).IsRequired();
        builder.Property(priority => priority.NormalizedName).HasColumnName("normalized_name").HasMaxLength(40).IsRequired();
        builder.Property(priority => priority.Tone).HasColumnName("tone").HasMaxLength(16).IsRequired();
        builder.Property(priority => priority.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(priority => priority.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(priority => priority.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(priority => priority.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(priority => new { priority.UserId, priority.SortOrder });
        builder.HasIndex(priority => new { priority.UserId, priority.NormalizedName })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
