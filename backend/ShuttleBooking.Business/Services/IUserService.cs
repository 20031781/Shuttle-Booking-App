using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Business.Services;

public interface IUserService
{
    Task<UserDto?> GetUserByEmailAsync(string email);
    Task<UserDto> RegisterUserAsync(RegisterUserRequest request);
    Task<LoginResponse> LoginWithGoogleAsync(GoogleLoginRequest request);
}
