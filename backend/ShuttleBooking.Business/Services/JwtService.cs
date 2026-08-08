using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Business.Services;

public class JwtService(IConfiguration configuration) : IJwtService
{
    public string GenerateToken(User user, IEnumerable<string> roles, DateTime expiresAtUtc)
    {
        var issuer = configuration["Jwt:Issuer"];
        var audience = configuration["Jwt:Audience"];
        var key = Encoding.UTF8.GetBytes(configuration["Jwt:Key"] ??
                                         throw new InvalidOperationException("JWT Key not configured"));

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}"),
            new("userId", user.Id.ToString())
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expiresAtUtc,
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    public DateTime GetTokenExpiration()
    {
        var expiryInDays = configuration.GetValue<int?>("Jwt:ExpiryInDays") ?? 7;
        if (expiryInDays < 1) expiryInDays = 1;

        return DateTime.UtcNow.AddDays(expiryInDays);
    }

    public DateTime GetRefreshTokenExpiration()
    {
        var expiryInDays = configuration.GetValue<int?>("Jwt:RefreshExpiryInDays") ?? 30;
        if (expiryInDays < 1) expiryInDays = 1;
        return DateTime.UtcNow.AddDays(expiryInDays);
    }

    public string HashRefreshToken(string refreshToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(refreshToken));
        return Convert.ToHexString(bytes);
    }
}