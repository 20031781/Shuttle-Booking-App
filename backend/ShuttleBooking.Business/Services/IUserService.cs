using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Business.Services;

public interface IUserService
{
    Task<UserDto?> GetUserByEmailAsync(string email);
    Task<UserDto?> GetUserByIdAsync(int userId);
    Task<UserDto> RegisterUserAsync(RegisterUserRequest request);
    Task<LoginResponse> RegisterAndLoginAsync(RegisterUserRequest request);
    Task<LoginResponse> LoginAsync(PasswordLoginRequest request);
    Task<LoginResponse> LoginWithGoogleAsync(GoogleLoginRequest request);
    Task<LoginResponse> RefreshTokenAsync(RefreshTokenRequest request);
    Task<UserDto> CompleteUserProfileAsync(int userId, CompleteUserProfileRequest request);
    Task<UserDto> UpdateUserNameAsync(int userId, UpdateUserNameRequest request);
    Task RegisterDeviceTokenAsync(int userId, DeviceTokenRequest request);
    Task UpdateNotificationPreferencesAsync(int userId, UpdateNotificationPreferencesRequest request);
    Task LogoutAsync(int userId);
    Task<UserRolesDto> AssignRoleAsync(string email, string role);
    Task<UserRolesDto> RevokeRoleAsync(string email, string role);
    Task<UserRolesDto> GetRolesAsync(string email);
}