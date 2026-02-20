using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class RegisterUserRequest
{
    [Required] [EmailAddress] public required string Email { get; set; }

    [Required] public required string FirstName { get; set; }

    [Required] public required string LastName { get; set; }

    [Required] public required string AuthProvider { get; init; }

    public string? ProfilePicture { get; set; }

    public string? Phone { get; set; }

    [Required] public required string PhoneCountryCode { get; set; }

    public string? Address { get; set; }

    [Required] public required string City { get; set; }
}