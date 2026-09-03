using Microsoft.EntityFrameworkCore;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Data.Repositories;

public class UserRoleRepository(AppDbContext context) : IUserRoleRepository
{
    public async Task<IReadOnlyCollection<string>> GetRolesAsync(int userId) =>
        await context.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.Role)
            .ToListAsync();

    public async Task AddRoleAsync(int userId, string role)
    {
        var alreadyAssigned = await context.UserRoles
            .AnyAsync(ur => ur.UserId == userId && ur.Role == role);
        if (alreadyAssigned) return;

        context.UserRoles.Add(new UserRole { UserId = userId, Role = role });
        await context.SaveChangesAsync();
    }

    public async Task<bool> RemoveRoleAsync(int userId, string role)
    {
        var existing = await context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == userId && ur.Role == role);
        if (existing == null) return false;

        context.UserRoles.Remove(existing);
        await context.SaveChangesAsync();
        return true;
    }
}