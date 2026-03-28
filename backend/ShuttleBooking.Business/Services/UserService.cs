using ShuttleBooking.Business.Models.User;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Business.Services;

public class UserService(
    IUserRepository userRepository,
    IJwtService jwtService,
    IGoogleAuthService googleAuthService)
    : IUserService
{
    public async Task<UserDto?> GetUserByEmailAsync(string email)
    {
        var normalizedEmail = NormalizeEmail(email);
        var user = await userRepository.GetByEmailAsync(normalizedEmail);
        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto?> GetUserByIdAsync(int userId)
    {
        var user = await userRepository.GetByIdAsync(userId);
        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto> RegisterUserAsync(RegisterUserRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        var normalizedAuthProvider = request.AuthProvider.Trim();
        var normalizedPassword = request.Password?.Trim();

        if (await userRepository.ExistsByEmailAsync(normalizedEmail))
            throw new InvalidOperationException($"Un utente con l'email {normalizedEmail} esiste già");

        if (string.Equals(normalizedAuthProvider, "App", StringComparison.OrdinalIgnoreCase) &&
            string.IsNullOrWhiteSpace(normalizedPassword))
            throw new ArgumentException("Password obbligatoria per utenti con AuthProvider 'App'.");

        var user = new User
        {
            Email = normalizedEmail,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            AuthProvider = normalizedAuthProvider,
            PasswordHash = string.IsNullOrWhiteSpace(normalizedPassword)
                ? null
                : PasswordHashing.HashPassword(normalizedPassword),
            ProfilePicture = request.ProfilePicture,
            Phone = request.Phone,
            PhoneCountryCode = request.PhoneCountryCode.Trim(),
            Address = request.Address,
            City = request.City.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        var createdUser = await userRepository.CreateAsync(user);
        return MapToDto(createdUser);
    }

    public async Task<LoginResponse> LoginAsync(PasswordLoginRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);
        var user = await userRepository.GetByEmailAsync(normalizedEmail)
                   ?? throw new UnauthorizedAccessException("Credenziali non valide.");

        if (string.IsNullOrWhiteSpace(user.PasswordHash) ||
            !PasswordHashing.VerifyPassword(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Credenziali non valide.");

        return await IssueTokensAsync(user);
    }

    public async Task<LoginResponse> LoginWithGoogleAsync(GoogleLoginRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);

        var isValidToken = await googleAuthService.ValidateTokenAsync(request.GoogleToken, normalizedEmail);
        if (!isValidToken)
            throw new UnauthorizedAccessException("Token Google non valido o non corrispondente all'email fornita");

        var user = await userRepository.GetByEmailAsync(normalizedEmail);
        if (user == null)
        {
            user = new User
            {
                Email = normalizedEmail,
                FirstName = "Utente",
                LastName = "Google",
                AuthProvider = "Google",
                PhoneCountryCode = "+39",
                City = "Sconosciuta",
                CreatedAt = DateTime.UtcNow
            };

            user = await userRepository.CreateAsync(user);
        }

        return await IssueTokensAsync(user);
    }

    public async Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request)
    {
        var refreshTokenHash = jwtService.HashRefreshToken(request.RefreshToken);
        var user = await userRepository.GetByRefreshTokenHashAsync(refreshTokenHash)
                   ?? throw new UnauthorizedAccessException("Refresh token non valido.");

        if (user.RefreshTokenRevokedAt.HasValue) throw new UnauthorizedAccessException("Refresh token revocato.");

        if (!user.RefreshTokenExpiresAt.HasValue || user.RefreshTokenExpiresAt.Value <= DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh token scaduto.");

        return await IssueTokensAsync(user);
    }

    public async Task RegisterDeviceTokenAsync(int userId, DeviceTokenRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        user.DeviceToken = request.Token.Trim();
        user.DevicePlatform = request.Platform.Trim().ToLowerInvariant();
        user.DeviceTokenUpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }

    public async Task LogoutAsync(int userId)
    {
        var user = await userRepository.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        user.RefreshTokenRevokedAt = DateTime.UtcNow;
        user.RefreshTokenHash = null;
        user.RefreshTokenExpiresAt = null;
        await userRepository.UpdateAsync(user);
    }

    private async Task<LoginResponse> IssueTokensAsync(User user)
    {
        var accessTokenExpiration = jwtService.GetTokenExpiration();
        var refreshTokenExpiration = jwtService.GetRefreshTokenExpiration();
        var refreshToken = jwtService.GenerateRefreshToken();

        user.RefreshTokenHash = jwtService.HashRefreshToken(refreshToken);
        user.RefreshTokenExpiresAt = refreshTokenExpiration;
        user.RefreshTokenRevokedAt = null;
        await userRepository.UpdateAsync(user);

        return new LoginResponse
        {
            User = MapToDto(user),
            Token = jwtService.GenerateToken(user, accessTokenExpiration),
            Expiration = accessTokenExpiration,
            RefreshToken = refreshToken,
            RefreshTokenExpiration = refreshTokenExpiration
        };
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static UserDto MapToDto(User user) =>
        new()
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName,
            AuthProvider = user.AuthProvider,
            CreatedAt = user.CreatedAt,
            ProfilePicture = user.ProfilePicture,
            Phone = user.Phone,
            PhoneCountryCode = user.PhoneCountryCode,
            Address = user.Address,
            City = user.City
        };
}