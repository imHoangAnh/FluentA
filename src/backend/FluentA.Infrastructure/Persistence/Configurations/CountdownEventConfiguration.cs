using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class CountdownEventConfiguration : IEntityTypeConfiguration<CountdownEventEntity>
{
    public void Configure(EntityTypeBuilder<CountdownEventEntity> builder)
    {
        builder.ToTable("countdowns");

        builder.HasKey(countdownEvent => countdownEvent.Id);

        builder.Property(countdownEvent => countdownEvent.Id).HasColumnName("id");
        builder.Property(countdownEvent => countdownEvent.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(countdownEvent => countdownEvent.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
        builder.Property(countdownEvent => countdownEvent.TargetDate).HasColumnName("target_date").HasColumnType("date").IsRequired();
        builder.Property(countdownEvent => countdownEvent.CoverAssetId).HasColumnName("cover_asset_id");
        builder.Property(countdownEvent => countdownEvent.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(countdownEvent => countdownEvent.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(countdownEvent => countdownEvent.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(countdownEvent => new { countdownEvent.UserId, countdownEvent.TargetDate });

        builder.HasMany(countdownEvent => countdownEvent.Alerts)
            .WithOne()
            .HasForeignKey(alert => alert.CountdownId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
