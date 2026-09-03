namespace ShuttleBooking.Business.Models.Admin;

public class UserRolesDto
{
    public required string Email { get; init; }
    public required IReadOnlyCollection<string> Roles { get; init; }
}