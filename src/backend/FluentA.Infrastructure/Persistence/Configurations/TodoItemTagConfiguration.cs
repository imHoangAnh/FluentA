using FluentA.Domain.BoundedContexts.Todo.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class TodoItemTagConfiguration : IEntityTypeConfiguration<TodoItemTag>
{
    public void Configure(EntityTypeBuilder<TodoItemTag> builder)
    {
        builder.ToTable("todo_item_tags");

        builder.HasKey(link => new { link.TodoItemId, link.TagId });

        builder.Property(link => link.TodoItemId).HasColumnName("todo_item_id").IsRequired();
        builder.Property(link => link.TagId).HasColumnName("tag_id").IsRequired();

        builder.HasOne(link => link.Tag)
            .WithMany()
            .HasForeignKey(link => link.TagId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(link => link.TagId);
    }
}
