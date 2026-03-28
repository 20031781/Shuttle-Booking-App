namespace ShuttleBooking.Business.Models.Push;

public enum PushSendStatus
{
    Sent,
    NotConfigured,
    UserNotFound,
    MissingDeviceToken,
    ProviderRejected,
    TransportError
}

public class PushSendResult
{
    public required PushSendStatus Status { get; init; }
    public string? Details { get; init; }
    public bool IsSuccess => Status == PushSendStatus.Sent;
}