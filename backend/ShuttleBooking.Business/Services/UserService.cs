using Microsoft.Extensions.Options;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.Auth;
using ShuttleBooking.Business.Models.User;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Business.Services;

public class UserService(
    IUserRepository userRepository,
    IUserRoleRepository userRoleRepository,
    IJwtService jwtService,
    IGoogleAuthService googleAuthService,
    IOptions<AdminDashboardOptions> adminOptionsAccessor,
    IOptions<ManagerDashboardOptions> managerOptionsAccessor)
    : IUserService
{
    private readonly AdminDashboardOptions _adminOptions = adminOptionsAccessor.Value;
    private readonly ManagerDashboardOptions _managerOptions = managerOptionsAccessor.Value;
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
        var firstName = NormalizeOptionalValue(request.FirstName);
        var lastName = NormalizeOptionalValue(request.LastName);
        var city = NormalizeOptionalValue(request.City);
        var club = NormalizeOptionalValue(request.Club);
        var usernameInput = NormalizeOptionalValue(request.Username);
        var phoneCountryCode = NormalizeOptionalValue(request.PhoneCountryCode) ?? "+39";
        var isProfileCompleted = HasCompletedProfile(firstName, lastName, city, club);

        if (await userRepository.ExistsByEmailAsync(normalizedEmail))
            throw new InvalidOperationException($"Un utente con l'email {normalizedEmail} esiste già");

        if (string.Equals(normalizedAuthProvider, "App", StringComparison.OrdinalIgnoreCase) &&
            string.IsNullOrWhiteSpace(normalizedPassword))
            throw new ArgumentException("Password obbligatoria per utenti con AuthProvider 'App'.");

        var username = string.IsNullOrWhiteSpace(usernameInput)
            ? await GenerateUniqueUsernameAsync(normalizedEmail)
            : await EnsureAvailableUsernameAsync(usernameInput);

        var user = new User
        {
            Email = normalizedEmail,
            FirstName = firstName ?? string.Empty,
            LastName = lastName ?? string.Empty,
            Username = username,
            AuthProvider = normalizedAuthProvider,
            PasswordHash = string.IsNullOrWhiteSpace(normalizedPassword)
                ? null
                : PasswordHashing.HashPassword(normalizedPassword),
            ProfilePicture = request.ProfilePicture,
            Phone = request.Phone,
            PhoneCountryCode = phoneCountryCode,
            Address = request.Address,
            City = city ?? string.Empty,
            Club = club,
            IsProfileCompleted = isProfileCompleted,
            CreatedAt = DateTime.UtcNow
        };

        var createdUser = await userRepository.CreateAsync(user);
        return MapToDto(createdUser);
    }

    public async Task<LoginResponse> RegisterAndLoginAsync(RegisterUserRequest request)
    {
        var registeredUser = await RegisterUserAsync(request);
        var createdUser = await userRepository.GetByIdAsync(registeredUser.Id)
                          ?? throw new InvalidOperationException("Utente appena registrato non trovato.");

        return await IssueTokensAsync(createdUser);
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
            var username = await GenerateUniqueUsernameAsync(normalizedEmail);

            user = new User
            {
                Email = normalizedEmail,
                FirstName = string.Empty,
                LastName = string.Empty,
                Username = username,
                AuthProvider = "Google",
                PhoneCountryCode = "+39",
                City = string.Empty,
                Club = null,
                IsProfileCompleted = false,
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

    public async Task<UserDto> CompleteUserProfileAsync(int userId, CompleteUserProfileRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        var firstName = NormalizeOptionalValue(request.FirstName);
        var lastName = NormalizeOptionalValue(request.LastName);
        var city = NormalizeOptionalValue(request.City);
        var club = NormalizeOptionalValue(request.Club);

        if (!HasCompletedProfile(firstName, lastName, city, club))
            throw new ArgumentException("Nome, cognome, club e città sono obbligatori.");

        user.FirstName = firstName!;
        user.LastName = lastName!;
        user.City = city!;
        user.Club = club!;
        user.IsProfileCompleted = true;

        var updated = await userRepository.UpdateAsync(user);
        return MapToDto(updated);
    }

    public async Task<UserDto> UpdateUserNameAsync(int userId, UpdateUserNameRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        var firstName = request.FirstName.Trim();
        var lastName = request.LastName.Trim();

        if (string.IsNullOrWhiteSpace(firstName) || string.IsNullOrWhiteSpace(lastName))
            throw new ArgumentException("Nome e cognome sono obbligatori.");

        var usernameInput = NormalizeOptionalValue(request.Username);
        if (!string.IsNullOrWhiteSpace(usernameInput))
        {
            var normalizedUsername = NormalizeUsername(usernameInput);
            var usernameTaken = await userRepository.ExistsByUsernameAsync(normalizedUsername, user.Id);
            if (usernameTaken) throw new InvalidOperationException($"Username {normalizedUsername} già in uso.");

            user.Username = normalizedUsername;
        }

        user.FirstName = firstName;
        user.LastName = lastName;
        var updated = await userRepository.UpdateAsync(user);
        return MapToDto(updated);
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

    public async Task UpdateNotificationPreferencesAsync(int userId, UpdateNotificationPreferencesRequest request)
    {
        var user = await userRepository.GetByIdAsync(userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        user.NotifyOnBookingConfirmation = request.BookingConfirmations;
        user.NotifyOnBookingCancellation = request.BookingCancellations;
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
        var roles = await ReconcileBootstrapRolesAsync(user);
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
            Token = jwtService.GenerateToken(user, roles, accessTokenExpiration),
            Expiration = accessTokenExpiration,
            RefreshToken = refreshToken,
            RefreshTokenExpiration = refreshTokenExpiration
        };
    }

    /// <summary>
    ///     Le allowlist email restano solo come bootstrap: se l'email dell'utente compare in
    ///     AdminDashboard/ManagerDashboard e non ha ancora il ruolo corrispondente, glielo assegna
    ///     in modo permanente. Da quel momento il ruolo vive nella tabella UserRoles e può essere
    ///     gestito via /AdminOps/Roles senza toccare la configurazione.
    /// </summary>
    private async Task<IReadOnlyCollection<string>> ReconcileBootstrapRolesAsync(User user)
    {
        var roles = new HashSet<string>(await userRoleRepository.GetRolesAsync(user.Id), StringComparer.Ordinal);

        if (EmailAllowlist.Contains(user.Email, _adminOptions.AllowedEmails) && roles.Add(Roles.Admin))
            await userRoleRepository.AddRoleAsync(user.Id, Roles.Admin);

        if (EmailAllowlist.Contains(user.Email, _managerOptions.AllowedEmails) && roles.Add(Roles.Manager))
            await userRoleRepository.AddRoleAsync(user.Id, Roles.Manager);

        return roles;
    }

    public async Task<UserRolesDto> AssignRoleAsync(string email, string role)
    {
        var normalizedRole = ValidateRole(role);
        var normalizedEmail = NormalizeEmail(email);
        var user = await userRepository.GetByEmailAsync(normalizedEmail)
                   ?? throw new KeyNotFoundException($"Utente con email {normalizedEmail} non trovato.");

        await userRoleRepository.AddRoleAsync(user.Id, normalizedRole);
        var roles = await userRoleRepository.GetRolesAsync(user.Id);
        return new UserRolesDto { Email = user.Email, Roles = roles };
    }

    public async Task<UserRolesDto> RevokeRoleAsync(string email, string role)
    {
        var normalizedRole = ValidateRole(role);
        var normalizedEmail = NormalizeEmail(email);
        var user = await userRepository.GetByEmailAsync(normalizedEmail)
                   ?? throw new KeyNotFoundException($"Utente con email {normalizedEmail} non trovato.");

        await userRoleRepository.RemoveRoleAsync(user.Id, normalizedRole);
        var roles = await userRoleRepository.GetRolesAsync(user.Id);
        return new UserRolesDto { Email = user.Email, Roles = roles };
    }

    public async Task<UserRolesDto> GetRolesAsync(string email)
    {
        var normalizedEmail = NormalizeEmail(email);
        var user = await userRepository.GetByEmailAsync(normalizedEmail)
                   ?? throw new KeyNotFoundException($"Utente con email {normalizedEmail} non trovato.");

        var roles = await userRoleRepository.GetRolesAsync(user.Id);
        return new UserRolesDto { Email = user.Email, Roles = roles };
    }

    private static string ValidateRole(string role)
    {
        var trimmedRole = role.Trim();
        var matchedRole = Roles.All.FirstOrDefault(known =>
            string.Equals(known, trimmedRole, StringComparison.OrdinalIgnoreCase));

        if (matchedRole == null)
            throw new ArgumentException(
                $"Ruolo '{role}' non valido. Ruoli disponibili: {string.Join(", ", Roles.All)}.");

        return matchedRole;
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
            City = user.City,
            Username = user.Username,
            Club = user.Club,
            IsProfileCompleted = user.IsProfileCompleted
        };

    private static string? NormalizeOptionalValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        return value.Trim();
    }

    private static bool HasCompletedProfile(string? firstName, string? lastName, string? city, string? club) =>
        !string.IsNullOrWhiteSpace(firstName)
        && !string.IsNullOrWhiteSpace(lastName)
        && !string.IsNullOrWhiteSpace(city)
        && !string.IsNullOrWhiteSpace(club);

    private async Task<string> EnsureAvailableUsernameAsync(string requestedUsername)
    {
        var normalizedUsername = NormalizeUsername(requestedUsername);
        var exists = await userRepository.ExistsByUsernameAsync(normalizedUsername);
        if (exists) throw new InvalidOperationException($"Username {normalizedUsername} già in uso.");

        return normalizedUsername;
    }

    private async Task<string> GenerateUniqueUsernameAsync(string email)
    {
        var baseUsername = BuildUsernameSeedFromEmail(email);
        var candidate = NormalizeUsername(baseUsername);
        var suffix = 0;

        while (await userRepository.ExistsByUsernameAsync(candidate))
        {
            suffix++;
            var suffixText = suffix.ToString();
            var maxSeedLength = Math.Max(3, 50 - suffixText.Length);
            var truncatedSeed = baseUsername.Length > maxSeedLength ? baseUsername[..maxSeedLength] : baseUsername;
            candidate = NormalizeUsername($"{truncatedSeed}{suffixText}");
        }

        return candidate;
    }

    private static string BuildUsernameSeedFromEmail(string email)
    {
        var localPart = email.Split('@')[0].Trim();
        var filtered = new string(localPart.Where(ch =>
            char.IsLetterOrDigit(ch) || ch == '.' || ch == '_' || ch == '-').ToArray());

        if (string.IsNullOrWhiteSpace(filtered)) filtered = "utente";

        return filtered;
    }

    private static string NormalizeUsername(string username)
    {
        var trimmed = username.Trim();
        var filtered = new string(trimmed.Where(ch =>
            char.IsLetterOrDigit(ch) || ch == '.' || ch == '_' || ch == '-').ToArray());

        if (string.IsNullOrWhiteSpace(filtered)) throw new ArgumentException("Username non valido.");

        if (filtered.Length < 3) throw new ArgumentException("Username troppo corto. Minimo 3 caratteri.");

        return filtered.Length > 50 ? filtered[..50] : filtered;
    }
}