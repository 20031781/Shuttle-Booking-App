namespace ShuttleBooking.Data.Interfaces;

public interface IUserRoleRepository
{
    Task<IReadOnlyCollection<string>> GetRolesAsync(int userId);
    Task AddRoleAsync(int userId, string role);
    Task<bool> RemoveRoleAsync(int userId, string role);
}