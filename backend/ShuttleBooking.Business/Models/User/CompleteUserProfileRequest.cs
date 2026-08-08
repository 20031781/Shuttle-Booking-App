using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class CompleteUserProfileRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public required string LastName { get; init; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public required string Club { get; init; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public required string City { get; init; }
}