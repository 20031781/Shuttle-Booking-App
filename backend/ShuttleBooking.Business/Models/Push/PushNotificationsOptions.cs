namespace ShuttleBooking.Business.Models.Push;

public class PushNotificationsOptions
{
    public bool Enabled { get; init; }
    public string? FirebaseProjectId { get; init; }
    public string? ServiceAccountPath { get; init; }
    public string? ServiceAccountJson { get; init; }
}