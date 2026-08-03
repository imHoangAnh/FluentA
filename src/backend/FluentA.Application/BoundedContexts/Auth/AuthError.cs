namespace FluentA.Application.BoundedContexts.Auth;

public sealed record AuthError(string Code, string Message, int StatusCode, object? Details = null)
{
    public static AuthError Validation(object details) =>
        new("VALIDATION_ERROR", "One or more validation errors occurred.", 422, details);

    public static AuthError EmailExists() =>
        new("EMAIL_ALREADY_EXISTS", "An account already exists for this email.", 409);

    public static AuthError InvalidCredentials() =>
        new("INVALID_CREDENTIALS", "Invalid email or password.", 401);

    public static AuthError EmailNotVerified() =>
        new("EMAIL_NOT_VERIFIED", "Please verify your email before logging in.", 403);

    public static AuthError InvalidVerificationOtp() =>
        new("INVALID_VERIFICATION_OTP", "The verification code is invalid or expired.", 401);

    public static AuthError VerificationOtpCooldown(DateTime resendAvailableAtUtc) =>
        new(
            "VERIFICATION_OTP_COOLDOWN",
            "Please wait before requesting another verification code.",
            429,
            new Dictionary<string, string[]>
            {
                ["resendAvailableAtUtc"] = [resendAvailableAtUtc.ToString("O")]
            });

    public static AuthError EmailAlreadyVerified() =>
        new("EMAIL_ALREADY_VERIFIED", "This email address is already verified.", 409);

    public static AuthError Unauthorized() =>
        new("UNAUTHORIZED", "Missing or invalid authentication credentials.", 401);

    public static AuthError PasswordResetNotAvailable() =>
        new("PASSWORD_RESET_NOT_AVAILABLE", "Password reset is not available for this account.", 409);

    public static AuthError InvalidPasswordResetToken() =>
        new("INVALID_PASSWORD_RESET_TOKEN", "The password reset link is invalid or expired.", 401);

    public static AuthError EmailDeliveryFailed() =>
        new("EMAIL_DELIVERY_FAILED", "Email delivery is temporarily unavailable. Please try again.", 503);

    public static AuthError GoogleNotConfigured() =>
        new("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth credentials are not configured for this environment.", 501);

    public static AuthError GoogleOAuthFailed() =>
        new("GOOGLE_ID_TOKEN_INVALID", "The Google identity token is invalid or expired.", 401);

    public static AuthError GoogleAccountConflict() =>
        new("GOOGLE_ACCOUNT_CONFLICT", "This email is already linked to a different Google account.", 409);

    public static AuthError AssetNotFound() =>
        new("ASSET_NOT_FOUND", "The requested asset could not be found.", 404);

    public static AuthError AvatarAssetInvalid() =>
        new("AVATAR_ASSET_INVALID", "The selected avatar asset must be a finalized avatar upload.", 409);
}
