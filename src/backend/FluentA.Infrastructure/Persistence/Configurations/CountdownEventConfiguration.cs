using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class CountdownEventConfiguration : IEntityTypeConfiguration<CountdownEventEntity>
{
    public void Configure(EntityTypeBuilder<CountdownEventEntity> builder)
    {
        builder.ToTable("countdown_events");

        builder.HasKey(countdownEvent => countdownEvent.Id);

        builder.Property(countdownEvent => countdownEvent.Id).HasColumnName("id");
        builder.Property(countdownEvent => countdownEvent.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(countdownEvent => countdownEvent.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
        builder.Property(countdownEvent => countdownEvent.TargetDate).HasColumnName("target_date").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(countdownEvent => countdownEvent.Color).HasColumnName("color").HasMaxLength(7);
        builder.Property(countdownEvent => countdownEvent.Icon).HasColumnName("icon").HasMaxLength(16);
        builder.Property(countdownEvent => countdownEvent.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(countdownEvent => countdownEvent.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(countdownEvent => countdownEvent.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(countdownEvent => new { countdownEvent.UserId, countdownEvent.TargetDate });
    }
}
