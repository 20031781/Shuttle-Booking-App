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

    public async Task<UserDto> RegisterUserAsync(RegisterUserRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);

        if (await userRepository.ExistsByEmailAsync(normalizedEmail))
            throw new InvalidOperationException($"Un utente con l'email {normalizedEmail} esiste già");

        var user = new User
        {
            Email = normalizedEmail,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            AuthProvider = request.AuthProvider.Trim(),
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

    public async Task<LoginResponse> LoginWithGoogleAsync(GoogleLoginRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.Email);

        // Valida il token di Google
        var isValidToken = await googleAuthService.ValidateTokenAsync(request.GoogleToken, normalizedEmail);

        if (!isValidToken)
            throw new UnauthorizedAccessException("Token Google non valido o non corrispondente all'email fornita");

        // Controlla se l'utente esiste
        var user = await userRepository.GetByEmailAsync(normalizedEmail);

        // Se l'utente non esiste, crea un nuovo utente
        if (user == null)
        {
            // In un caso reale, qui otterremmo più informazioni dal token di Google
            // Per semplicità, creiamo un utente con informazioni minime
            user = new User
            {
                Email = normalizedEmail,
                FirstName = "Utente", // In pratica queste informazioni sarebbero ottenute dal profilo Google
                LastName = "Google", // In pratica queste informazioni sarebbero ottenute dal profilo Google
                AuthProvider = "Google",
                PhoneCountryCode = "+39", // Valore predefinito
                City = "Sconosciuta", // Valore predefinito
                CreatedAt = DateTime.UtcNow
            };

            user = await userRepository.CreateAsync(user);
        }

        // Genera il token JWT
        var expiration = jwtService.GetTokenExpiration();
        var token = jwtService.GenerateToken(user, expiration);

        return new LoginResponse
        {
            User = MapToDto(user),
            Token = token,
            Expiration = expiration
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