using ShuttleBooking.Business.Models.Push;

namespace ShuttleBooking.Business.Services;

public interface IPushNotificationService
{
    Task<PushSendResult> SendToUserAsync(
        int userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default);
}