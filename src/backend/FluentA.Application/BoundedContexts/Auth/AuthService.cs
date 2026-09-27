using System.Net;
using System.Text.RegularExpressions;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using FluentA.Application.Common.Interfaces;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.BoundedContexts.Auth;

public sealed partial class AuthService : IAuthService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);
    private const string ForgotPasswordMessage = "If an eligible account exists, password reset instructions have been sent.";

    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenHelper _tokenHelper;
    private readonly IJwtService _jwtService;
    private readonly IGoogleIdTokenVerifier _googleVerifier;
    private readonly IEmailService _emailService;
    private readonly IAssetRepository _assets;
    private readonly IAssetObjectStorage _assetStorage;
    private readonly string _frontendBaseUrl;

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IPasswordHasher passwordHasher,
        ITokenHelper tokenHelper,
        IJwtService jwtService,
        IGoogleIdTokenVerifier googleVerifier,
        IEmailService emailService,
        IAssetRepository assets,
        IAssetObjectStorage assetStorage,
        AuthApplicationOptions options)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _tokenHelper = tokenHelper;
        _jwtService = jwtService;
        _googleVerifier = googleVerifier;
        _emailService = emailService;
        _assets = assets;
        _assetStorage = assetStorage;
        _frontendBaseUrl = options.FrontendBaseUrl.TrimEnd('/');
    }

    public async Task<OperationResult<RegisterResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateRegistration(request);
        if (errors.Count > 0) return OperationResult<RegisterResponse>.Failure(AuthError.Validation(errors));

        var email = User.NormalizeEmail(request.Email!);
        var user = User.CreateWithPassword(email, request.FullName, _passwordHasher.Hash(request.Password));
        var rawOtp = _tokenHelper.GenerateOtp();
        var expiresAt = DateTime.UtcNow.Add(OtpLifetime);
        user.IssueVerificationOtp(_tokenHelper.HashOtp(email, rawOtp), expiresAt);

        if (!await _users.TryUpsertUnverifiedRegistrationAsync(user, cancellationToken))
        {
            return OperationResult<RegisterResponse>.Failure(AuthError.EmailExists());
        }

        if (!await _emailService.SendEmailAsync(BuildVerificationEmail(user, rawOtp, expiresAt), cancellationToken))
        {
            return OperationResult<RegisterResponse>.Failure(AuthError.EmailDeliveryFailed());
        }

        return OperationResult<RegisterResponse>.Success(new RegisterResponse(
            "VERIFY_EMAIL",
            "Registration successful. Enter the verification code sent to your email.",
            email,
            expiresAt));
    }

    public async Task<OperationResult<VerifyOtpResponse>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (!EmailPattern().IsMatch(request.Email ?? string.Empty)) errors["email"] = ["Email must be a valid email address."];
        if (!OtpPattern().IsMatch(request.Otp ?? string.Empty)) errors["otp"] = ["Verification code must be six digits."];
        if (errors.Count > 0) return OperationResult<VerifyOtpResponse>.Failure(AuthError.Validation(errors));

        var email = User.NormalizeEmail(request.Email!);
        var consumed = await _users.ConsumeVerificationOtpAsync(
            email,
            _tokenHelper.HashOtp(email, request.Otp!),
            DateTime.UtcNow,
            cancellationToken);

        return consumed == VerificationOtpConsumeResult.Verified
            ? OperationResult<VerifyOtpResponse>.Success(new VerifyOtpResponse("REGISTERED"))
            : OperationResult<VerifyOtpResponse>.Failure(AuthError.InvalidVerificationOtp());
    }

    public async Task<OperationResult<ResendVerificationOtpResponse>> ResendVerificationOtpAsync(ResendVerificationOtpRequest request, CancellationToken cancellationToken = default)
    {
        if (!EmailPattern().IsMatch(request.Email ?? string.Empty))
        {
            return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.Validation(
                new Dictionary<string, string[]> { ["email"] = ["Email must be a valid email address."] }));
        }

        var email = User.NormalizeEmail(request.Email!);
        var user = await _users.GetByEmailAsync(email, cancellationToken);
        if (user is null) return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.InvalidVerificationOtp());
        if (user.IsEmailVerified) return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.EmailAlreadyVerified());

        var rawOtp = _tokenHelper.GenerateOtp();
        var expiresAt = DateTime.UtcNow.Add(OtpLifetime);
        var replaced = await _users.TryReplaceVerificationOtpAsync(
            user.Id,
            _tokenHelper.HashOtp(email, rawOtp),
            expiresAt,
            DateTime.UtcNow,
            cancellationToken);
        if (!replaced) return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.EmailAlreadyVerified());

        if (!await _emailService.SendEmailAsync(BuildVerificationEmail(user, rawOtp, expiresAt), cancellationToken))
        {
            return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.EmailDeliveryFailed());
        }

        return OperationResult<ResendVerificationOtpResponse>.Success(new ResendVerificationOtpResponse(
            "VERIFY_EMAIL", "A new verification code has been sent.", email, expiresAt));
    }

    public async Task<OperationResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.InvalidCredentials());
        }

        var user = await _users.GetByEmailAsync(User.NormalizeEmail(request.Email), cancellationToken);
        if (user is null || user.DeletedAt is not null || user.PasswordHash is null
            || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.InvalidCredentials());
        }

        if (!user.IsEmailVerified)
        {
            return OperationResult<AuthResponse>.Success(new AuthResponse(
                "VERIFY_EMAIL",
                Email: user.Email,
                VerificationExpiresAtUtc: user.OtpExpiresAt,
                Message: "Please verify your email before logging in."));
        }

        var now = DateTime.UtcNow;
        var refreshToken = _tokenHelper.GenerateRawToken();
        var refreshExpiresAt = now.Add(RefreshTokenLifetime);
        var access = await _refreshTokens.TryCreateForPasswordLoginAsync(
            user.Id,
            _tokenHelper.HashToken(refreshToken),
            now,
            refreshExpiresAt,
            user.PasswordHash,
            userId => _jwtService.GenerateToken(userId, DateTime.UtcNow),
            cancellationToken);
        if (access is null)
        {
            return OperationResult<AuthResponse>.Failure(AuthError.InvalidCredentials());
        }

        return OperationResult<AuthResponse>.Success(await BuildAuthResponseAsync(
            user, refreshToken, refreshExpiresAt, access, cancellationToken));
    }

    public async Task<OperationResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.Validation(
                new Dictionary<string, string[]> { ["idToken"] = ["Google ID token is required."] }));
        }

        var verification = await _googleVerifier.VerifyAsync(request.IdToken, cancellationToken);
        if (!verification.IsSuccess) return OperationResult<AuthResponse>.Failure(verification.Error!);
        var google = verification.Value!;
        if (!google.EmailVerified) return OperationResult<AuthResponse>.Failure(AuthError.GoogleOAuthFailed());

        var email = User.NormalizeEmail(google.Email);
        var now = DateTime.UtcNow;
        var refreshToken = _tokenHelper.GenerateRawToken();
        var result = await _refreshTokens.TryCreateForGoogleLoginAsync(
            email,
            google.FullName,
            google.Subject,
            _tokenHelper.HashToken(refreshToken),
            now,
            now.Add(RefreshTokenLifetime),
            userId => _jwtService.GenerateToken(userId, DateTime.UtcNow),
            cancellationToken);
        if (result.Result == GoogleLoginResult.AccountConflict)
        {
            return OperationResult<AuthResponse>.Failure(AuthError.GoogleAccountConflict());
        }

        var user = await _users.GetByEmailAsync(email, cancellationToken);
        return user is null || result.AccessToken is null
            ? OperationResult<AuthResponse>.Failure(AuthError.Unauthorized())
            : OperationResult<AuthResponse>.Success(await BuildAuthResponseAsync(
                user,
                refreshToken,
                now.Add(RefreshTokenLifetime),
                result.AccessToken,
                cancellationToken));
    }

    public async Task<OperationResult<RefreshResponse>> RefreshAsync(string? rawRefreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            return OperationResult<RefreshResponse>.Failure(AuthError.RefreshTokenInvalid());
        }

        var refreshed = await _refreshTokens.IssueAccessTokenAsync(
            _tokenHelper.HashToken(rawRefreshToken),
            userId => _jwtService.GenerateToken(userId, DateTime.UtcNow),
            cancellationToken);
        return refreshed is null
            ? OperationResult<RefreshResponse>.Failure(AuthError.RefreshTokenInvalid())
            : OperationResult<RefreshResponse>.Success(refreshed);
    }

    public Task LogoutAsync(string? rawRefreshToken, CancellationToken cancellationToken = default) =>
        string.IsNullOrWhiteSpace(rawRefreshToken)
            ? Task.CompletedTask
            : _refreshTokens.RevokeAsync(_tokenHelper.HashToken(rawRefreshToken), cancellationToken);

    public async Task<OperationResult<ForgotPasswordResponse>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (EmailPattern().IsMatch(request.Email ?? string.Empty))
        {
            var email = User.NormalizeEmail(request.Email!);
            var user = await _users.GetByEmailAsync(email, cancellationToken);
            if (user?.PasswordHash is not null)
            {
                var rawToken = _tokenHelper.GenerateRawToken();
                var now = DateTime.UtcNow;
                var expiresAt = now.Add(ResetTokenLifetime);
                if (await _users.TrySetPasswordResetAsync(email, _tokenHelper.HashToken(rawToken), expiresAt, now, cancellationToken))
                {
                    await _emailService.SendEmailAsync(BuildPasswordResetEmail(user, rawToken, expiresAt), cancellationToken);
                }
            }
        }

        return OperationResult<ForgotPasswordResponse>.Success(new ForgotPasswordResponse(ForgotPasswordMessage));
    }

    public async Task<OperationResult<BasicMessageResponse>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Token)) errors["token"] = ["Password reset token is required."];
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8) errors["newPassword"] = ["Password must be at least 8 characters."];
        if (errors.Count > 0) return OperationResult<BasicMessageResponse>.Failure(AuthError.Validation(errors));

        var consumed = await _users.ConsumePasswordResetAsync(
            _tokenHelper.HashToken(request.Token),
            _passwordHasher.Hash(request.NewPassword),
            DateTime.UtcNow,
            cancellationToken);
        return consumed
            ? OperationResult<BasicMessageResponse>.Success(new BasicMessageResponse(
                "Password reset successful. Please log in with your new password.", "LOGIN"))
            : OperationResult<BasicMessageResponse>.Failure(AuthError.InvalidPasswordResetToken());
    }

    public async Task<OperationResult<AuthUserDto>> GetMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return user is null
            ? OperationResult<AuthUserDto>.Failure(AuthError.Unauthorized())
            : OperationResult<AuthUserDto>.Success(await BuildAuthUserAsync(user, cancellationToken));
    }

    public async Task<OperationResult<UserProfileDto>> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return user is null
            ? OperationResult<UserProfileDto>.Failure(AuthError.Unauthorized())
            : OperationResult<UserProfileDto>.Success(await BuildProfileAsync(user, cancellationToken));
    }

    public async Task<OperationResult<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null) return OperationResult<UserProfileDto>.Failure(AuthError.Unauthorized());
        var errors = ValidateProfileUpdate(request);
        if (errors.Count > 0) return OperationResult<UserProfileDto>.Failure(AuthError.Validation(errors));

        Asset? selectedAvatarAsset = null;
        if (!request.RemoveAvatar && request.AvatarAssetId.HasValue)
        {
            selectedAvatarAsset = await _assets.GetOwnedAsync(userId, request.AvatarAssetId.Value, cancellationToken);
            if (selectedAvatarAsset is null) return OperationResult<UserProfileDto>.Failure(AuthError.AssetNotFound());
            if (selectedAvatarAsset.Type != AssetType.Avatar || selectedAvatarAsset.Status != AssetStatus.Ready)
                return OperationResult<UserProfileDto>.Failure(AuthError.AvatarAssetInvalid());
        }

        Asset? currentAvatarAsset = user.CurrentAvatarAssetId.HasValue
            ? await _assets.GetOwnedAsync(userId, user.CurrentAvatarAssetId.Value, cancellationToken)
            : null;
        var originalName = user.FullName;
        var originalBio = user.Bio;
        var originalAvatar = user.CurrentAvatarAssetId;
        var selectingNew = selectedAvatarAsset is not null && selectedAvatarAsset.Id != originalAvatar;
        var nextAvatar = request.RemoveAvatar ? null : selectedAvatarAsset?.Id ?? originalAvatar;
        if (currentAvatarAsset is not null && currentAvatarAsset.Id != nextAvatar && (request.RemoveAvatar || selectingNew))
            currentAvatarAsset.Archive(DateTime.UtcNow, TimeSpan.FromDays(30));

        try
        {
            user.UpdateProfile(request.FullName!, request.Bio, nextAvatar);
            if (!await _users.UpdateProfileAsync(user, cancellationToken))
            {
                return OperationResult<UserProfileDto>.Failure(AuthError.Unauthorized());
            }
        }
        catch
        {
            user.UpdateProfile(originalName, originalBio, originalAvatar);
            throw;
        }

        return OperationResult<UserProfileDto>.Success(await BuildProfileAsync(user, cancellationToken));
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(
        User user,
        string refreshToken,
        DateTime refreshExpiresAtUtc,
        AccessTokenIssue access,
        CancellationToken cancellationToken)
    {
        var principal = await BuildAuthUserAsync(user, cancellationToken);
        return new AuthResponse("AUTHENTICATED", access.Token, refreshToken, access.ExpiresAtUtc,
            refreshExpiresAtUtc, principal);
    }

    private async Task<AuthUserDto> BuildAuthUserAsync(User user, CancellationToken cancellationToken)
    {
        var avatar = await BuildAvatarDownloadAsync(user, cancellationToken);
        return new AuthUserDto(user.Id, user.FullName, avatar.Url);
    }

    private async Task<UserProfileDto> BuildProfileAsync(User user, CancellationToken cancellationToken)
    {
        var avatar = await BuildAvatarDownloadAsync(user, cancellationToken);
        return new UserProfileDto(user.Id, user.Email, user.FullName, user.IsEmailVerified,
            user.Bio, user.CurrentAvatarAssetId, avatar.Url, avatar.ExpiresAtUtc);
    }

    private async Task<(string? Url, DateTime? ExpiresAtUtc)> BuildAvatarDownloadAsync(User user, CancellationToken cancellationToken)
    {
        if (!user.CurrentAvatarAssetId.HasValue) return (null, null);
        var asset = await _assets.GetOwnedAsync(user.Id, user.CurrentAvatarAssetId.Value, cancellationToken);
        if (asset is null || asset.Type != AssetType.Avatar || asset.Status != AssetStatus.Ready) return (null, null);
        try
        {
            var download = _assetStorage.CreatePresignedDownload(new AssetDownloadRequest(asset.ObjectKey, TimeSpan.FromMinutes(5)));
            return (download.Url, download.ExpiresAtUtc);
        }
        catch (AssetStorageUnavailableException)
        {
            return (null, null);
        }
    }

    private static EmailMessage BuildVerificationEmail(User user, string otp, DateTime expiresAt) => new(
        user.Email,
        "Verify your FluentA email",
        $"<p>Hello {WebUtility.HtmlEncode(user.FullName)},</p><p>Your verification code is <strong>{otp}</strong>.</p><p>It expires at {expiresAt:O}.</p>",
        $"Your FluentA verification code is {otp}. It expires at {expiresAt:O}.");

    private EmailMessage BuildPasswordResetEmail(User user, string rawToken, DateTime expiresAt)
    {
        var resetUrl = $"{_frontendBaseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";
        var encodedUrl = WebUtility.HtmlEncode(resetUrl);
        return new EmailMessage(
            user.Email,
            "Reset your FluentA password",
            $"<p>Hello {WebUtility.HtmlEncode(user.FullName)},</p><p><a href=\"{encodedUrl}\">Reset your password</a>.</p><p>This single-use link expires at {expiresAt:O}.</p>",
            $"Reset your FluentA password: {resetUrl}. This single-use link expires at {expiresAt:O}.");
    }

    private static Dictionary<string, string[]> ValidateRegistration(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (!EmailPattern().IsMatch(request.Email ?? string.Empty)) errors["email"] = ["Email must be a valid email address."];
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8) errors["password"] = ["Password must be at least 8 characters."];
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length is < 2 or > 100) errors["fullName"] = ["Full name must be between 2 and 100 characters."];
        return errors;
    }

    private static Dictionary<string, string[]> ValidateProfileUpdate(UpdateProfileRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length is < 2 or > 100) errors["fullName"] = ["Full name must be between 2 and 100 characters."];
        if ((request.Bio?.Trim().Length ?? 0) > 500) errors["bio"] = ["Bio must be 500 characters or fewer."];
        if (request.RemoveAvatar && request.AvatarAssetId.HasValue) errors["avatarAssetId"] = ["Avatar asset id cannot be provided when removing the current avatar."];
        if (request.AvatarAssetId == Guid.Empty) errors["avatarAssetId"] = ["Avatar asset id must be a non-empty GUID."];
        return errors;
    }

    [GeneratedRegex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex EmailPattern();

    [GeneratedRegex("^\\d{6}$", RegexOptions.Compiled)]
    private static partial Regex OtpPattern();
}
