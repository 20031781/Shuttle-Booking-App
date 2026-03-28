using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class RefreshTokenRequest
{
    [Required]
    public required string RefreshToken { get; init; }
}