using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByGoogleIdAsync(string googleId);
    Task<User?> GetByRefreshTokenHashAsync(string refreshTokenHash);
    Task<User> CreateAsync(User user);
    Task<User?> GetByIdAsync(int id);
    Task<bool> ExistsByEmailAsync(string email);
    Task<bool> ExistsByUsernameAsync(string username, int? excludingUserId = null);
    Task<User> LinkGoogleAccountAsync(int userId, string googleId, string? profilePicture);
    Task<User> UpdateAsync(User user);
}