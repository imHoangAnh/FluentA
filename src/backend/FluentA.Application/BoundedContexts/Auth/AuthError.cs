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

    public static AuthError InvalidVerificationToken() =>
        new("INVALID_VERIFICATION_TOKEN", "The email verification link is invalid or expired.", 401);

    public static AuthError Unauthorized() =>
        new("UNAUTHORIZED", "Missing or invalid authentication credentials.", 401);

    public static AuthError GoogleNotConfigured() =>
        new("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth credentials are not configured for this environment.", 501);

    public static AuthError GoogleOAuthFailed() =>
        new("GOOGLE_OAUTH_FAILED", "Google OAuth could not complete with the provided authorization code.", 401);

    public static AuthError GoogleAccountConflict() =>
        new("GOOGLE_ACCOUNT_CONFLICT", "This email is already linked to a different Google account.", 409);
}
