namespace ShuttleBooking.Business.Models.Push;

/// <summary>
///     Valori del campo <c>type</c> inviato nel data payload delle notifiche push.
///     L'app mobile li usa per decidere su quale sezione aprirsi al tap
///     (vedi <c>mobile/src/lib/notification-navigation.ts</c>): vanno mantenuti
///     allineati alle due parti.
/// </summary>
public static class PushNotificationTypes
{
    public const string BookingConfirmed = "booking_confirmed";
    public const string BookingCanceled = "booking_canceled";
}