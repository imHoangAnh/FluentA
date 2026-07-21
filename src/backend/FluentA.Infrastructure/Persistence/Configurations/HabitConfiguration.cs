using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class HabitConfiguration : IEntityTypeConfiguration<HabitEntity>
{
    public void Configure(EntityTypeBuilder<HabitEntity> builder)
    {
        builder.ToTable("habits", table =>
            table.HasCheckConstraint("ck_habits_goal_days_positive", "goal_days IS NULL OR goal_days > 0"));

        builder.HasKey(habit => habit.Id);

        builder.Property(habit => habit.Id).HasColumnName("id");
        builder.Property(habit => habit.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(habit => habit.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
        builder.Property(habit => habit.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(habit => habit.Icon).HasColumnName("icon").HasConversion<string>().HasMaxLength(10).HasDefaultValue(HabitIcon.Default).IsRequired();
        builder.Property(habit => habit.Frequency).HasColumnName("frequency").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(habit => habit.CustomDays).HasColumnName("custom_days").HasMaxLength(120);
        builder.Property(habit => habit.StartDate).HasColumnName("start_date").HasColumnType("date").IsRequired();
        builder.Property(habit => habit.GoalDays).HasColumnName("goal_days");
        builder.Property(habit => habit.LastReminderSentOn).HasColumnName("last_reminder_sent_on").HasColumnType("date");
        builder.Property(habit => habit.ReminderEnabled).HasColumnName("reminder_enabled").HasDefaultValue(true).IsRequired();
        builder.Property(habit => habit.ReminderTime).HasColumnName("reminder_time").HasColumnType("time without time zone").HasPrecision(0).IsRequired();
        builder.Property(habit => habit.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(habit => habit.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(habit => habit.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(habit => habit.UserId);
        builder.HasIndex(habit => new { habit.UserId, habit.Name });
        builder.HasIndex(habit => new { habit.ReminderEnabled, habit.ReminderTime, habit.LastReminderSentOn })
            .HasDatabaseName("ix_habits_reminder_due");
        builder.Ignore(habit => habit.ScheduledCustomDays);
    }
}
