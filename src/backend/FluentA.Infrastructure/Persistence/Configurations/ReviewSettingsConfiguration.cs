using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ReviewSettingsConfiguration : IEntityTypeConfiguration<ReviewSettings>
{
    public void Configure(EntityTypeBuilder<ReviewSettings> builder)
    {
        builder.ToTable("review_settings");
        builder.HasKey(settings => settings.Id);
        builder.Property(settings => settings.Id).HasColumnName("id");
        builder.Property(settings => settings.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(settings => settings.DailyLimit).HasColumnName("daily_limit").IsRequired();
        builder.Property(settings => settings.RecapAfterAnswer).HasColumnName("recap_after_answer").IsRequired();
        builder.Property(settings => settings.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(settings => settings.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(settings => settings.DeletedAt).HasColumnName("deleted_at");
        builder.HasIndex(settings => settings.UserId).IsUnique().HasDatabaseName("IX_review_settings_user_id");
        builder.HasOne<User>().WithOne().HasForeignKey<ReviewSettings>(settings => settings.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
