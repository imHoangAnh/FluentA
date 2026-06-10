using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
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
        builder.Property(settings => settings.NewCardsPerDay).HasColumnName("new_cards_per_day").IsRequired();
        builder.Property(settings => settings.ReviewCardsPerDay).HasColumnName("review_cards_per_day").IsRequired();
        builder.Property(settings => settings.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(settings => settings.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(settings => settings.DeletedAt).HasColumnName("deleted_at");
        builder.HasIndex(settings => settings.UserId).IsUnique();
        builder.HasOne<User>().WithOne().HasForeignKey<ReviewSettings>(settings => settings.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
