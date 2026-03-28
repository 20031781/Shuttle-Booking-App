using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Business.Services;

public interface IJwtService
{
    string GenerateToken(User user, DateTime expiresAtUtc);
    string GenerateRefreshToken();
    DateTime GetTokenExpiration();
    DateTime GetRefreshTokenExpiration();
    string HashRefreshToken(string refreshToken);
}