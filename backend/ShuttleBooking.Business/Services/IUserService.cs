using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Business.Services;

public interface IUserService
{
    Task<UserDto?> GetUserByEmailAsync(string email);
    Task<UserDto?> GetUserByIdAsync(int userId);
    Task<UserDto> RegisterUserAsync(RegisterUserRequest request);
    Task<LoginResponse> LoginAsync(PasswordLoginRequest request);
    Task<LoginResponse> LoginWithGoogleAsync(GoogleLoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task RegisterDeviceTokenAsync(int userId, DeviceTokenRequest request);
    Task LogoutAsync(int userId);
}