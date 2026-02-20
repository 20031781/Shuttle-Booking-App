using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;

namespace ShuttleBooking.Business.Services;

public class GoogleAuthService(HttpClient httpClient, IConfiguration configuration) : IGoogleAuthService
{
    private readonly IConfiguration _configuration = configuration;

    public async Task<bool> ValidateTokenAsync(string token, string email)
    {
        try
        {
            // Google token info endpoint
            var response = await httpClient.GetAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={token}");

            if (!response.IsSuccessStatusCode)
                return false;

            // Deserializzare la risposta
            var tokenInfo = await response.Content.ReadFromJsonAsync<GoogleTokenInfo>();

            // Verifica che l'email nel token corrisponda all'email fornita
            if (tokenInfo == null || string.IsNullOrEmpty(tokenInfo.Email))
                return false;

            return tokenInfo.Email.ToLower() == email.ToLower() && tokenInfo.EmailVerified;
        }
        catch
        {
            return false;
        }
    }

    private class GoogleTokenInfo
    {
        public string? Email { get; set; }
        public bool EmailVerified { get; set; }
    }
}