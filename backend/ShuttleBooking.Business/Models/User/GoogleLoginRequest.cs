using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class GoogleLoginRequest
{
    [Required] [EmailAddress] public required string Email { get; set; }

    [Required] public required string GoogleToken { get; set; }
}