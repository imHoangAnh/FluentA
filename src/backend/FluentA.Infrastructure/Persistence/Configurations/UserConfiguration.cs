using FluentA.Domain.BoundedContexts.Auth.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("auth_users");

        builder.HasKey(user => user.Id);

        builder.Property(user => user.Id).HasColumnName("id");
        builder.Property(user => user.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
        builder.Property(user => user.FullName).HasColumnName("full_name").HasMaxLength(100).IsRequired();
        builder.Property(user => user.Bio).HasColumnName("bio").HasMaxLength(500).IsRequired();
        builder.Property(user => user.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(2048);
        builder.Property(user => user.AvatarPublicId).HasColumnName("avatar_public_id").HasMaxLength(255);
        builder.Property(user => user.PasswordHash).HasColumnName("password_hash").HasMaxLength(256);
        builder.Property(user => user.GoogleId).HasColumnName("google_id").HasMaxLength(128);
        builder.Property(user => user.IsEmailVerified).HasColumnName("is_email_verified").IsRequired();
        builder.Property(user => user.LastLoginAt).HasColumnName("last_login_at");
        builder.Property(user => user.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(user => user.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(user => user.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(user => user.Email).IsUnique();
        builder.HasIndex(user => user.GoogleId).IsUnique().HasFilter("google_id IS NOT NULL");
    }
}
