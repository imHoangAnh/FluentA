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
        builder.Property(item => item.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(item => item.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(item => item.IsImportant).HasColumnName("is_important").HasDefaultValue(false).IsRequired();
        builder.Property(item => item.RepeatPattern).HasColumnName("repeat_pattern").HasConversion<string>().HasMaxLength(16);
        builder.Property(item => item.ReminderTime).HasColumnName("reminder_time").HasColumnType("time without time zone");
        builder.Property(item => item.ReminderTimeZoneId).HasColumnName("reminder_time_zone_id").HasMaxLength(100);
        builder.Property(item => item.ReminderScheduledAtUtc).HasColumnName("reminder_scheduled_at_utc");
        builder.Property(item => item.ReminderSentAtUtc).HasColumnName("reminder_sent_at_utc");
        builder.Property(item => item.GeneratedFromTodoId).HasColumnName("generated_from_todo_id");
        builder.Property(item => item.IsGeneratedOccurrencePristine)
            .HasColumnName("is_generated_occurrence_pristine")
            .HasDefaultValue(false)
            .IsRequired();
        builder.Property(item => item.CompletedAt).HasColumnName("completed_at");
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(item => new { item.UserId, item.Date, item.SortOrder });
        builder.HasIndex(item => new { item.UserId, item.IsCompleted, item.Date });
        builder.HasIndex(item => item.ReminderScheduledAtUtc)
            .HasFilter("reminder_scheduled_at_utc IS NOT NULL AND reminder_sent_at_utc IS NULL AND is_completed = FALSE AND deleted_at IS NULL");
        builder.HasOne<TodoItem>()
            .WithMany()
            .HasForeignKey(item => item.GeneratedFromTodoId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasIndex(item => item.GeneratedFromTodoId)
            .IsUnique()
            .HasFilter("generated_from_todo_id IS NOT NULL AND deleted_at IS NULL");
    }
}
