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
    private readonly IUserRepository _users;
    private readonly IAccountChallengeStore _challengeStore;
    private readonly IRefreshTokenStore _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IGoogleOAuthClient _googleOAuthClient;
    private readonly IAccountEmailSender _accountEmailSender;
    private readonly IAssetRepository _assets;
    private readonly IAssetObjectStorage _assetStorage;

    public AuthService(
        IUserRepository users,
        IAccountChallengeStore challengeStore,
        IRefreshTokenStore refreshTokens,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IGoogleOAuthClient googleOAuthClient,
        IAccountEmailSender accountEmailSender,
        IAssetRepository assets,
        IAssetObjectStorage assetStorage)
    {
        _users = users;
        _challengeStore = challengeStore;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _googleOAuthClient = googleOAuthClient;
        _accountEmailSender = accountEmailSender;
        _assets = assets;
        _assetStorage = assetStorage;
    }

    public async Task<OperationResult<RegisterResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateRegistration(request);
        if (errors.Count > 0)
        {
            return OperationResult<RegisterResponse>.Failure(AuthError.Validation(errors));
        }

        var normalizedEmail = User.NormalizeEmail(request.Email);
        if (await _users.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            return OperationResult<RegisterResponse>.Failure(AuthError.EmailExists());
        }

        var user = User.CreateWithPassword(normalizedEmail, request.FullName, _passwordHasher.Hash(request.Password));
        await _users.AddAsync(user, cancellationToken);
        var challenge = await _challengeStore.IssueVerificationAsync(user.Id, user.Email, cancellationToken);
        var delivery = await _accountEmailSender.SendVerificationOtpAsync(
            new VerificationOtpEmailMessage(
                user.Email,
                user.FullName,
                challenge.Otp,
                challenge.ExpiresAtUtc),
            cancellationToken);

        return OperationResult<RegisterResponse>.Success(new RegisterResponse(
            "Registration successful. Enter the verification code we sent to your email.",
            user.Email,
            challenge.ExpiresAtUtc,
            challenge.ResendAvailableAtUtc,
            delivery.DevelopmentOtp));
    }

    public async Task<OperationResult<UserProfileDto>> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (!EmailPattern().IsMatch(request.Email ?? string.Empty))
        {
            errors["email"] = ["Email must be a valid email address."];
        }

        if (!OtpPattern().IsMatch(request.Otp ?? string.Empty))
        {
            errors["otp"] = ["Verification code must be six digits."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<UserProfileDto>.Failure(AuthError.Validation(errors));
        }

        var email = request.Email!;
        var otp = request.Otp!;
        var normalizedEmail = User.NormalizeEmail(email);
        var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            return OperationResult<UserProfileDto>.Failure(AuthError.InvalidVerificationOtp());
        }

        var challengeResult = await _challengeStore.VerifyVerificationOtpAsync(normalizedEmail, otp, cancellationToken);
        if (challengeResult.Status is not VerificationChallengeVerifyStatus.Verified)
        {
            return OperationResult<UserProfileDto>.Failure(AuthError.InvalidVerificationOtp());
        }

        if (!user.IsEmailVerified)
        {
            user.MarkEmailVerified();
            await _users.UpdateAsync(user, cancellationToken);
        }

        return OperationResult<UserProfileDto>.Success(await BuildProfileAsync(user, cancellationToken));
    }

    public async Task<OperationResult<ResendVerificationOtpResponse>> ResendVerificationOtpAsync(ResendVerificationOtpRequest request, CancellationToken cancellationToken = default)
    {
        if (!EmailPattern().IsMatch(request.Email ?? string.Empty))
        {
            return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.Validation(new Dictionary<string, string[]>
            {
                ["email"] = ["Email must be a valid email address."]
            }));
        }

        var normalizedEmail = User.NormalizeEmail(request.Email!);
        var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.InvalidVerificationOtp());
        }

        if (user.IsEmailVerified)
        {
            return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.EmailAlreadyVerified());
        }

        var resend = await _challengeStore.ResendVerificationAsync(user.Id, normalizedEmail, cancellationToken);
        if (!resend.IsSuccess)
        {
            return OperationResult<ResendVerificationOtpResponse>.Failure(AuthError.VerificationOtpCooldown(resend.ResendAvailableAtUtc));
        }

        var delivery = await _accountEmailSender.SendVerificationOtpAsync(
            new VerificationOtpEmailMessage(
                user.Email,
                user.FullName,
                resend.Otp!,
                resend.ExpiresAtUtc),
            cancellationToken);

        return OperationResult<ResendVerificationOtpResponse>.Success(new ResendVerificationOtpResponse(
            "A new verification code has been sent.",
            user.Email,
            resend.ExpiresAtUtc,
            resend.ResendAvailableAtUtc,
            delivery.DevelopmentOtp));
    }

    public async Task<OperationResult<ForgotPasswordResponse>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (!EmailPattern().IsMatch(request.Email ?? string.Empty))
        {
            return OperationResult<ForgotPasswordResponse>.Failure(AuthError.Validation(new Dictionary<string, string[]>
            {
                ["email"] = ["Email must be a valid email address."]
            }));
        }

        var normalizedEmail = User.NormalizeEmail(request.Email!);
        var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            return OperationResult<ForgotPasswordResponse>.Success(new ForgotPasswordResponse(
                "No FluentA account exists for this email.",
                AccountExists: false));
        }

        if (user.PasswordHash is null)
        {
            return OperationResult<ForgotPasswordResponse>.Failure(AuthError.PasswordResetNotAvailable());
        }

        var challenge = await _challengeStore.IssuePasswordResetAsync(user.Id, user.Email, cancellationToken);
        var resetUrl = $"/reset-password?token={Uri.EscapeDataString(challenge.Token)}";
        var delivery = await _accountEmailSender.SendPasswordResetAsync(
            new PasswordResetEmailMessage(
                user.Email,
                user.FullName,
                resetUrl,
                challenge.ExpiresAtUtc),
            cancellationToken);

        return OperationResult<ForgotPasswordResponse>.Success(new ForgotPasswordResponse(
            "Password reset instructions have been sent to your email.",
            AccountExists: true,
            delivery.DevelopmentResetUrl));
    }

    public async Task<OperationResult<BasicMessageResponse>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.Token))
        {
            errors["token"] = ["Password reset token is required."];
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            errors["password"] = ["Password must be at least 8 characters."];
        }

        if (!string.Equals(request.Password, request.ConfirmPassword, StringComparison.Ordinal))
        {
            errors["confirmPassword"] = ["Password confirmation must match."];
        }

        if (errors.Count > 0)
        {
            return OperationResult<BasicMessageResponse>.Failure(AuthError.Validation(errors));
        }

        var challenge = await _challengeStore.ConsumePasswordResetAsync(request.Token, cancellationToken);
        if (challenge.Status is not PasswordResetChallengeConsumeStatus.Consumed || !challenge.UserId.HasValue)
        {
            return OperationResult<BasicMessageResponse>.Failure(AuthError.InvalidPasswordResetToken());
        }

        var user = await _users.GetByIdAsync(challenge.UserId.Value, cancellationToken);
        if (user is null || user.PasswordHash is null)
        {
            return OperationResult<BasicMessageResponse>.Failure(AuthError.InvalidPasswordResetToken());
        }

        user.UpdatePassword(_passwordHasher.Hash(request.Password));
        await _users.UpdateAsync(user, cancellationToken);

        return OperationResult<BasicMessageResponse>.Success(new BasicMessageResponse("Password reset successful. Please log in with your new password."));
    }

    public async Task<OperationResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);
        var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user?.PasswordHash is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.InvalidCredentials());
        }

        if (!user.IsEmailVerified)
        {
            return OperationResult<AuthResponse>.Failure(AuthError.EmailNotVerified());
        }

        user.RecordLogin(DateTime.UtcNow);
        await _users.UpdateAsync(user, cancellationToken);

        return OperationResult<AuthResponse>.Success(await BuildAuthResponseAsync(user, cancellationToken));
    }

    public async Task<OperationResult<AuthResponse>> RefreshAsync(string? refreshToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.Unauthorized());
        }

        var session = await _refreshTokens.FindActiveAsync(refreshToken, cancellationToken);
        if (session is null)
        {
            return OperationResult<AuthResponse>.Failure(AuthError.Unauthorized());
        }

        var user = await _users.GetByIdAsync(session.UserId, cancellationToken);
        if (user is null)
        {
            return OperationResult<AuthResponse>.Failure(AuthError.Unauthorized());
        }

        await _refreshTokens.RevokeAsync(refreshToken, cancellationToken);
        return OperationResult<AuthResponse>.Success(await BuildAuthResponseAsync(user, cancellationToken));
    }

    public async Task<OperationResult<bool>> LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrWhiteSpace(refreshToken))
        {
            await _refreshTokens.RevokeAsync(refreshToken, cancellationToken);
        }

        return OperationResult<bool>.Success(true);
    }

    public async Task<OperationResult<UserProfileDto>> GetMeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        return user is null
            ? OperationResult<UserProfileDto>.Failure(AuthError.Unauthorized())
            : OperationResult<UserProfileDto>.Success(await BuildProfileAsync(user, cancellationToken));
    }

    public async Task<OperationResult<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _users.GetByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return OperationResult<UserProfileDto>.Failure(AuthError.Unauthorized());
        }

        var errors = ValidateProfileUpdate(request);
        if (errors.Count > 0)
        {
            return OperationResult<UserProfileDto>.Failure(AuthError.Validation(errors));
        }

        Asset? selectedAvatarAsset = null;
        if (!request.RemoveAvatar && request.AvatarAssetId.HasValue)
        {
            selectedAvatarAsset = await _assets.GetOwnedAsync(userId, request.AvatarAssetId.Value, cancellationToken);
            if (selectedAvatarAsset is null)
            {
                return OperationResult<UserProfileDto>.Failure(AuthError.AssetNotFound());
            }

            if (selectedAvatarAsset.Type != AssetType.Avatar || selectedAvatarAsset.Status != AssetStatus.Ready)
            {
                return OperationResult<UserProfileDto>.Failure(AuthError.AvatarAssetInvalid());
            }
        }

        Asset? currentAvatarAsset = null;
        if (user.CurrentAvatarAssetId.HasValue)
        {
            currentAvatarAsset = await _assets.GetOwnedAsync(userId, user.CurrentAvatarAssetId.Value, cancellationToken);
        }

        var originalName = user.FullName;
        var originalBio = user.Bio;
        var originalAvatarUrl = user.AvatarUrl;
        var originalCurrentAvatarAssetId = user.CurrentAvatarAssetId;
        var isSelectingNewAvatarAsset = selectedAvatarAsset is not null && selectedAvatarAsset.Id != originalCurrentAvatarAssetId;
        var nextAvatarUrl = request.RemoveAvatar
            ? null
            : selectedAvatarAsset?.PublicUrl ?? originalAvatarUrl;
        var nextCurrentAvatarAssetId = request.RemoveAvatar
            ? (Guid?)null
            : selectedAvatarAsset?.Id ?? originalCurrentAvatarAssetId;
        var retiringCurrentAvatarAsset = currentAvatarAsset is not null
            && currentAvatarAsset.Id != nextCurrentAvatarAssetId
            && (request.RemoveAvatar || isSelectingNewAvatarAsset);

        if (retiringCurrentAvatarAsset)
        {
            currentAvatarAsset!.MarkDeleted(DateTime.UtcNow);
        }

        try
        {
            user.UpdateProfile(request.FullName!, request.Bio, nextAvatarUrl, nextCurrentAvatarAssetId);
            await _users.UpdateAsync(user, cancellationToken);
        }
        catch
        {
            if (isSelectingNewAvatarAsset && selectedAvatarAsset is not null)
            {
                await TryDeleteAssetObjectAsync(selectedAvatarAsset.ObjectKey, cancellationToken);
            }

            user.UpdateProfile(originalName, originalBio, originalAvatarUrl, originalCurrentAvatarAssetId);
            throw;
        }

        if (retiringCurrentAvatarAsset)
        {
            await TryDeleteAssetObjectAsync(currentAvatarAsset!.ObjectKey, cancellationToken);
        }

        return OperationResult<UserProfileDto>.Success(await BuildProfileAsync(user, cancellationToken));
    }

    public async Task<OperationResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.Validation(new Dictionary<string, string[]>
            {
                ["code"] = ["Google authorization code is required."]
            }));
        }

        var googleUserResult = await _googleOAuthClient.ExchangeCodeAsync(request, cancellationToken);
        if (!googleUserResult.IsSuccess)
        {
            return OperationResult<AuthResponse>.Failure(googleUserResult.Error!);
        }

        var googleUser = googleUserResult.Value!;
        var normalizedEmail = User.NormalizeEmail(googleUser.Email);
        var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null)
        {
            user = User.CreateWithGoogle(normalizedEmail, googleUser.FullName, googleUser.Subject);
            await _users.AddAsync(user, cancellationToken);
        }
        else
        {
            if (user.GoogleId is not null && !string.Equals(user.GoogleId, googleUser.Subject, StringComparison.Ordinal))
            {
                return OperationResult<AuthResponse>.Failure(AuthError.GoogleAccountConflict());
            }

            user.LinkGoogleAccount(googleUser.Subject, googleUser.FullName);
            await _users.UpdateAsync(user, cancellationToken);
        }

        user.RecordLogin(DateTime.UtcNow);
        await _users.UpdateAsync(user, cancellationToken);

        return OperationResult<AuthResponse>.Success(await BuildAuthResponseAsync(user, cancellationToken));
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user, CancellationToken cancellationToken)
    {
        var refreshToken = await _refreshTokens.IssueAsync(user.Id, cancellationToken);
        var profile = await BuildProfileAsync(user, cancellationToken);
        return new AuthResponse(_tokenService.CreateAccessToken(profile), profile, refreshToken.RawToken);
    }

    private async Task<UserProfileDto> BuildProfileAsync(User user, CancellationToken cancellationToken)
    {
        string? downloadUrl = null;
        DateTime? downloadUrlExpiresAtUtc = null;

        if (user.CurrentAvatarAssetId.HasValue)
        {
            var asset = await _assets.GetOwnedAsync(user.Id, user.CurrentAvatarAssetId.Value, cancellationToken);
            if (asset is not null && asset.Type == AssetType.Avatar && asset.Status == AssetStatus.Ready)
            {
                try
                {
                    var download = _assetStorage.CreatePresignedDownload(new AssetDownloadRequest(asset.ObjectKey, TimeSpan.FromMinutes(5)));
                    downloadUrl = download.Url;
                    downloadUrlExpiresAtUtc = download.ExpiresAtUtc;
                }
                catch (AssetStorageUnavailableException)
                {
                    // Fail closed: omit the image rather than expose a durable provider URL.
                }
            }
        }

        return new UserProfileDto(
            user.Id,
            user.Email,
            user.FullName,
            user.IsEmailVerified,
            user.Bio,
            user.CurrentAvatarAssetId,
            downloadUrl,
            downloadUrlExpiresAtUtc);
    }

    private static Dictionary<string, string[]> ValidateProfileUpdate(UpdateProfileRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length is < 2 or > 100)
        {
            errors["fullName"] = ["Full name must be between 2 and 100 characters."];
        }

        if ((request.Bio?.Trim().Length ?? 0) > 500)
        {
            errors["bio"] = ["Bio must be 500 characters or fewer."];
        }

        if (request.RemoveAvatar && request.AvatarAssetId.HasValue)
        {
            errors["avatarAssetId"] = ["Avatar asset id cannot be provided when removing the current avatar."];
        }

        if (request.AvatarAssetId.HasValue && request.AvatarAssetId.Value == Guid.Empty)
        {
            errors["avatarAssetId"] = ["Avatar asset id must be a non-empty GUID."];
        }

        return errors;
    }

    private async Task TryDeleteAssetObjectAsync(string objectKey, CancellationToken cancellationToken)
    {
        try
        {
            await _assetStorage.DeleteIfExistsAsync(objectKey, cancellationToken);
        }
        catch (AssetStorageUnavailableException)
        {
        }
    }

    private static Dictionary<string, string[]> ValidateRegistration(RegisterRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        if (!EmailPattern().IsMatch(request.Email ?? string.Empty))
        {
            errors["email"] = ["Email must be a valid email address."];
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            errors["password"] = ["Password must be at least 8 characters."];
        }

        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length is < 2 or > 100)
        {
            errors["fullName"] = ["Full name must be between 2 and 100 characters."];
        }

        return errors;
    }

    [GeneratedRegex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled)]
    private static partial Regex EmailPattern();

    [GeneratedRegex("^\\d{6}$", RegexOptions.Compiled)]
    private static partial Regex OtpPattern();
}
