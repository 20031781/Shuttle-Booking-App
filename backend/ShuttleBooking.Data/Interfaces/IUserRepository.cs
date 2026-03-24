using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User> CreateAsync(User user);
    Task<User?> GetByIdAsync(int id);
    Task<bool> ExistsByEmailAsync(string email);
    Task<User> UpdateAsync(User user);
}