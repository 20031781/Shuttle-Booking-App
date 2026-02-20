using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Business.Services;

public interface IJwtService
{
    string GenerateToken(User user);
    DateTime GetTokenExpiration();
}
