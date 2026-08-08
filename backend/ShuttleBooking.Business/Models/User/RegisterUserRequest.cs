using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class RegisterUserRequest
{
    [Required] [EmailAddress] public required string Email { get; set; }

    [StringLength(50, MinimumLength = 1)] public string? FirstName { get; set; }

    [StringLength(50, MinimumLength = 1)] public string? LastName { get; set; }

    [Required] public required string AuthProvider { get; init; }

    [MinLength(8)] public string? Password { get; init; }

    public string? ProfilePicture { get; set; }

    public string? Phone { get; set; }

    [StringLength(5, MinimumLength = 1)] public string? PhoneCountryCode { get; set; }

    public string? Address { get; set; }

    [StringLength(100, MinimumLength = 1)] public string? City { get; set; }

    [StringLength(50, MinimumLength = 3)] public string? Username { get; set; }

    [StringLength(100, MinimumLength = 1)] public string? Club { get; set; }
}