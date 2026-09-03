namespace ShuttleBooking.Business.Services;

public interface IGoogleAuthService
{
    Task<GoogleIdentity> ValidateIdTokenAsync(string idToken);
}

/// <summary>
///     Identita' attestata da Google dopo la validazione dell'ID token. Nessun
///     campo di questa struttura proviene dal payload inviato dal client.
/// </summary>
public sealed record GoogleIdentity(
    string Subject,
    string Email,
    string? FullName,
    string? PictureUrl,
    bool EmailVerified);