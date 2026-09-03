using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace ShuttleBooking.Business.Services;

/// <summary>
///     Valida localmente gli ID token Google, inclusi firma, issuer, scadenza e
///     audience. Non usa l'endpoint tokeninfo e non si fida di dati identitari
///     forniti separatamente dall'app client.
/// </summary>
public sealed class GoogleAuthService(IConfiguration configuration) : IGoogleAuthService
{
    public async Task<GoogleIdentity> ValidateIdTokenAsync(string idToken)
    {
        if (string.IsNullOrWhiteSpace(idToken) || idToken.Length > 20_000)
            throw new InvalidOperationException("ID token Google non valido.");

        var audiences = GoogleAudienceConfiguration.GetAudiences(configuration);
        if (audiences.Count == 0)
            throw new InvalidOperationException("Nessun Google OAuth client ID configurato.");

        var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
            new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = audiences
            });

        return new GoogleIdentity(
            payload.Subject ?? string.Empty,
            payload.Email ?? string.Empty,
            payload.Name,
            payload.Picture,
            payload.EmailVerified);
    }
}