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
        var user = await userRepository.GetByEmailAsync(email);
        return user == null ? null : MapToDto(user);
    }

    public async Task<UserDto> RegisterUserAsync(RegisterUserRequest request)
    {
        if (await userRepository.ExistsByEmailAsync(request.Email))
            throw new InvalidOperationException($"Un utente con l'email {request.Email} esiste già");

        var user = new User
        {
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            AuthProvider = request.AuthProvider,
            ProfilePicture = request.ProfilePicture,
            Phone = request.Phone,
            PhoneCountryCode = request.PhoneCountryCode,
            Address = request.Address,
            City = request.City,
            CreatedAt = DateTime.UtcNow
        };

        var createdUser = await userRepository.CreateAsync(user);
        return MapToDto(createdUser);
    }

    public async Task<LoginResponse> LoginWithGoogleAsync(GoogleLoginRequest request)
    {
        // Valida il token di Google
        var isValidToken = await googleAuthService.ValidateTokenAsync(request.GoogleToken, request.Email);

        if (!isValidToken)
            throw new UnauthorizedAccessException("Token Google non valido o non corrispondente all'email fornita");

        // Controlla se l'utente esiste
        var user = await userRepository.GetByEmailAsync(request.Email);

        // Se l'utente non esiste, crea un nuovo utente
        if (user == null)
        {
            // In un caso reale, qui otterremmo più informazioni dal token di Google
            // Per semplicità, creiamo un utente con informazioni minime
            user = new User
            {
                Email = request.Email,
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
        var token = jwtService.GenerateToken(user);

        return new LoginResponse
        {
            User = MapToDto(user),
            Token = token,
            Expiration = jwtService.GetTokenExpiration()
        };
    }

    private static UserDto MapToDto(User user)
    {
        return new UserDto
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
}