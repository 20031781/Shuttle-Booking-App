namespace ShuttleBooking.Business.Models.User;

public class LoginResponse
{
    public required UserDto User { get; init; }
    public required string Token { get; init; }
    public DateTime Expiration { get; init; }
}