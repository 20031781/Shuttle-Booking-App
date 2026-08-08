using Microsoft.EntityFrameworkCore;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Data.Repositories;

public class UserRepository(AppDbContext context) : IUserRepository
{
    public async Task<User?> GetByEmailAsync(string email)
    {
        var normalizedEmail = NormalizeEmail(email);

        return await context.Users
            .FirstOrDefaultAsync(u => u.Email.ToUpper() == normalizedEmail);
    }

    public async Task<User?> GetByRefreshTokenHashAsync(string refreshTokenHash) =>
        await context.Users
            .FirstOrDefaultAsync(u => u.RefreshTokenHash == refreshTokenHash);

    public async Task<User> CreateAsync(User user)
    {
        user.Email = NormalizeEmail(user.Email).ToLowerInvariant();
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user;
    }

    public async Task<User?> GetByIdAsync(int id) => await context.Users.FindAsync(id);

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        var normalizedEmail = NormalizeEmail(email);

        return await context.Users.AnyAsync(u => u.Email.ToUpper() == normalizedEmail);
    }

    public async Task<bool> ExistsByUsernameAsync(string username, int? excludingUserId = null)
    {
        var normalizedUsername = NormalizeUsername(username);
        return await context.Users.AnyAsync(u =>
            u.Username != null &&
            u.Username.ToUpper() == normalizedUsername &&
            (!excludingUserId.HasValue || u.Id != excludingUserId.Value));
    }

    public async Task<User> UpdateAsync(User user)
    {
        user.Email = NormalizeEmail(user.Email).ToLowerInvariant();
        context.Users.Update(user);
        await context.SaveChangesAsync();
        return user;
    }

    private static string NormalizeEmail(string email) => email.Trim().ToUpperInvariant();

    private static string NormalizeUsername(string username) => username.Trim().ToUpperInvariant();
}