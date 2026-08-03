using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(user => user.Id);

        builder.Property(user => user.Id).HasColumnName("id");
        builder.Property(user => user.Email).HasColumnName("email").HasMaxLength(320).IsRequired();
        builder.Property(user => user.FullName).HasColumnName("full_name").HasMaxLength(100).IsRequired();
        builder.Property(user => user.Bio).HasColumnName("bio").HasMaxLength(500).IsRequired();
        builder.Property(user => user.CurrentAvatarAssetId).HasColumnName("current_avatar_asset_id");
        builder.Property(user => user.PasswordHash).HasColumnName("password_hash").HasMaxLength(256);
        builder.Property(user => user.GoogleId).HasColumnName("google_id").HasMaxLength(128);
        builder.Ignore(user => user.IsEmailVerified);
        builder.Property(user => user.EmailVerifiedAt).HasColumnName("email_verified_at");
        builder.Property(user => user.OtpCode).HasColumnName("otp_code").HasMaxLength(256);
        builder.Property(user => user.OtpExpiresAt).HasColumnName("otp_expires_at");
        builder.Property(user => user.OtpFailedAttempts).HasColumnName("otp_failed_attempts").HasDefaultValue(0).IsRequired();
        builder.Property(user => user.OtpResendAvailableAt).HasColumnName("otp_resend_available_at");
        builder.Property(user => user.ResetPasswordToken).HasColumnName("reset_password_token").HasMaxLength(256);
        builder.Property(user => user.ResetPasswordExpiresAt).HasColumnName("reset_password_expires_at");
        builder.Property(user => user.LastLoginAt).HasColumnName("last_login_at");
        builder.Property(user => user.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(user => user.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(user => user.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(user => user.Email).IsUnique();
        builder.HasIndex(user => user.GoogleId).IsUnique().HasFilter("google_id IS NOT NULL");
        builder.HasIndex(user => user.ResetPasswordToken).IsUnique().HasFilter("reset_password_token IS NOT NULL");
        builder.HasIndex(user => user.CurrentAvatarAssetId);

        builder.HasOne<Asset>()
            .WithMany()
            .HasForeignKey(user => user.CurrentAvatarAssetId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
