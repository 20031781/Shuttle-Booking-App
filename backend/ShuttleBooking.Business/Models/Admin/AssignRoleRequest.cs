using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.Admin;

public class AssignRoleRequest
{
    [Required] [EmailAddress] public required string Email { get; init; }

    [Required] public required string Role { get; init; }
}
