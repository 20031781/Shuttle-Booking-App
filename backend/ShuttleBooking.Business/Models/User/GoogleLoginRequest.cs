using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class GoogleLoginRequest
{
    /// <summary>
    ///     ID token emesso da Google. L'API ricava email, subject e profilo dal
    ///     token validato: il client non invia un'email separata che potrebbe
    ///     non corrispondere all'identita' Google.
    /// </summary>
    [Required]
    [StringLength(20_000, MinimumLength = 1)]
    public required string IdToken { get; init; }
}