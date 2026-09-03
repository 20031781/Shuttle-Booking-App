namespace ShuttleBooking.Business.Services;

/// <summary>
///     Invia messaggi email transazionali. L'implementazione concreta non deve mai
///     contenere credenziali: arrivano dalla configurazione dell'host.
/// </summary>
public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string htmlBody);
}