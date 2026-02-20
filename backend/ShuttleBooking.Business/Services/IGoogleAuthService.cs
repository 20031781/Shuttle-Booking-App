namespace ShuttleBooking.Business.Services;

public interface IGoogleAuthService
{
    Task<bool> ValidateTokenAsync(string token, string email);
}
