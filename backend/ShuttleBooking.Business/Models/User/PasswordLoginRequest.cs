using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class PasswordLoginRequest
{
    [Required] [EmailAddress] public required string Email { get; init; }

    [Required] [MinLength(8)] public required string Password { get; init; }
}