using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ShuttleBooking.Business.Services;

public class GoogleAuthService(
    HttpClient httpClient,
    IConfiguration configuration,
    ILogger<GoogleAuthService> logger) : IGoogleAuthService
{
    public async Task<bool> ValidateTokenAsync(string token, string email)
    {
        try
        {
            var response = await httpClient.GetFromJsonAsync<GoogleTokenInfo>(
                $"https://oauth2.googleapis.com/tokeninfo?id_token={token}");

            if (response == null || string.IsNullOrWhiteSpace(response.Email)) return false;

            if (!string.Equals(response.Email, email, StringComparison.OrdinalIgnoreCase)) return false;

            if (!string.Equals(response.EmailVerified, bool.TrueString, StringComparison.OrdinalIgnoreCase))
                return false;

            if (IsTokenExpired(response.ExpiresAtUnix)) return false;

            var expectedAudiences = new HashSet<string>(StringComparer.Ordinal);
            var singleAudience = configuration["GoogleAuth:ClientId"];
            if (!string.IsNullOrWhiteSpace(singleAudience)) expectedAudiences.Add(singleAudience.Trim());

            var configuredAudiences = configuration.GetSection("GoogleAuth:ClientIds").Get<string[]>();
            if (configuredAudiences != null)
                foreach (var audience in configuredAudiences.Where(value => !string.IsNullOrWhiteSpace(value)))
                    expectedAudiences.Add(audience.Trim());

            if (expectedAudiences.Count > 0 &&
                (string.IsNullOrWhiteSpace(response.Audience) || !expectedAudiences.Contains(response.Audience)))
                return false;

            return true;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Validazione token Google non riuscita");
            return false;
        }
    }

    private static bool IsTokenExpired(string? expiresAtUnix)
    {
        if (!long.TryParse(expiresAtUnix, out var expirationValue)) return true;

        var expiration = DateTimeOffset.FromUnixTimeSeconds(expirationValue);
        return expiration <= DateTimeOffset.UtcNow;
    }

    private sealed class GoogleTokenInfo
    {
        [JsonPropertyName("email")]
        public string? Email { get; init; }

        [JsonPropertyName("email_verified")]
        public string? EmailVerified { get; init; }

        [JsonPropertyName("aud")]
        public string? Audience { get; init; }

        [JsonPropertyName("exp")]
        public string? ExpiresAtUnix { get; init; }
    }
}