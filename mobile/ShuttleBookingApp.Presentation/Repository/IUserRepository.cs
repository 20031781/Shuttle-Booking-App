using ShuttleBookingApp.Business.Models;

namespace ShuttleBookingApp.Presentation.Repository;

public interface IUserRepository
{
    Task<User?> Login(string email, string password, CancellationToken cancellationToken = default);
    Task<User?> LoginWithGoogle(string email, string token, User? userData = null, CancellationToken cancellationToken = default);
    Task<User?> GetUserByEmail(string email, CancellationToken cancellationToken = default);
    Task<User> CreateUser(User? user, CancellationToken cancellationToken = default);
}