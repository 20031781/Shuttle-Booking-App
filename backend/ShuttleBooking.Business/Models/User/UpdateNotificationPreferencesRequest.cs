namespace ShuttleBooking.Business.Models.User;

public class UpdateNotificationPreferencesRequest
{
    public bool BookingConfirmations { get; init; } = true;
    public bool BookingCancellations { get; init; } = true;
}