using FluentA.Domain.BoundedContexts.Pomodoro.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PomodoroSessionConfiguration : IEntityTypeConfiguration<PomodoroSession>
{
    public void Configure(EntityTypeBuilder<PomodoroSession> builder)
    {
        builder.ToTable("pomodoro_sessions");
        builder.HasKey(session => session.Id);
        builder.Property(session => session.Id).HasColumnName("id");
        builder.Property(session => session.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(session => session.Phase).HasColumnName("phase").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(session => session.State).HasColumnName("state").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(session => session.StartedAt).HasColumnName("started_at").IsRequired();
        builder.Property(session => session.CompletedAt).HasColumnName("completed_at").IsRequired();
        builder.Property(session => session.DurationSeconds).HasColumnName("duration_seconds").IsRequired();
        builder.Property(session => session.LinkedTaskId).HasColumnName("linked_task_id");
        builder.Property(session => session.LinkedTaskSource).HasColumnName("linked_task_source").HasMaxLength(16);
        builder.Property(session => session.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(session => session.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(session => session.DeletedAt).HasColumnName("deleted_at");
        builder.HasIndex(session => new { session.UserId, session.CompletedAt });
    }
}
