using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class UpdateUserNameRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string LastName { get; init; }

    [StringLength(50, MinimumLength = 3)] public string? Username { get; init; }
}