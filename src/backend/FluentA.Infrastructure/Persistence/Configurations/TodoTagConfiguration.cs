using FluentA.Domain.BoundedContexts.Todo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class TodoTagConfiguration : IEntityTypeConfiguration<TodoTag>
{
    public void Configure(EntityTypeBuilder<TodoTag> builder)
    {
        builder.ToTable("todo_tags");

        builder.HasKey(tag => tag.Id);

        builder.Property(tag => tag.Id).HasColumnName("id");
        builder.Property(tag => tag.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(tag => tag.Name).HasColumnName("name").HasMaxLength(32).IsRequired();
        builder.Property(tag => tag.NormalizedName).HasColumnName("normalized_name").HasMaxLength(32).IsRequired();
        builder.Property(tag => tag.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(tag => tag.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(tag => tag.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(tag => new { tag.UserId, tag.NormalizedName })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
