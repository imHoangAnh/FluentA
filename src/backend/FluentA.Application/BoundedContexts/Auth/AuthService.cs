using System.Text.RegularExpressions;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using FluentA.Application.Common.Interfaces;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.BoundedContexts.Auth;

public sealed partial class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenStore _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ITokenService _tokenService;
    private readonly IGoogleOAuthClient _googleOAuthClient;

    public AuthService(
        IUserRepository users,
        IRefreshTokenStore refreshTokens,
        IPasswordHasher passwordHasher,
        ITokenService tokenService,
        IGoogleOAuthClient googleOAuthClient)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _googleOAuthClient = googleOAuthClient;
    }

    public async Task<OperationResult<string>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var errors = ValidateRegistration(request);
        if (errors.Count > 0)
        {
            return OperationResult<string>.Failure(AuthError.Validation(errors));
        }

        var normalizedEmail = User.NormalizeEmail(request.Email);
        if (await _users.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            return OperationResult<string>.Failure(AuthError.EmailExists());
        }

        var user = User.CreateWithPassword(normalizedEmail, request.FullName, _passwordHasher.Hash(request.Password));
        await _users.AddAsync(user, cancellationToken);

        return OperationResult<string>.Success("Registration successful. Please verify your email.");
    }

    public async Task<OperationResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = User.NormalizeEmail(request.Email);
        var user = await _users.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user?.PasswordHash is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return OperationResult<AuthResponse>.Failure(AuthError.InvalidCredentials());
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
            : OperationResult<UserProfileDto>.Success(ToProfile(user));
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
        var profile = ToProfile(user);
        return new AuthResponse(_tokenService.CreateAccessToken(profile), profile, refreshToken.RawToken);
    }

    private static UserProfileDto ToProfile(User user) =>
        new(user.Id, user.Email, user.FullName, user.IsEmailVerified);

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
}
