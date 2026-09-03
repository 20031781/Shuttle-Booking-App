using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace ShuttleBooking.Business.Services;

/// <summary>
///     Sender HTTP per Resend. Usa la stessa API del progetto di riferimento e
///     rende idempotenti gli invii identici a livello provider.
/// </summary>
public sealed class ResendEmailSender(HttpClient httpClient, IConfiguration configuration) : IEmailSender
{
    public async Task SendAsync(string toEmail, string subject, string htmlBody)
    {
        var apiKey = configuration["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new InvalidOperationException("Resend:ApiKey non configurata.");

        var fromAddress = configuration["Resend:FromAddress"];
        if (string.IsNullOrWhiteSpace(fromAddress))
            throw new InvalidOperationException("Resend:FromAddress non configurato.");

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(new
            {
                from = fromAddress,
                to = new[] { toEmail },
                subject,
                html = htmlBody
            })
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        request.Headers.UserAgent.ParseAdd("ShuttleBooking.Api/1.0");
        request.Headers.TryAddWithoutValidation("Idempotency-Key", CreateIdempotencyKey(toEmail, subject, htmlBody));

        using var response = await httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode) return;

        var error = await response.Content.ReadAsStringAsync();
        throw new InvalidOperationException($"Invio email Resend fallito ({response.StatusCode}): {error}");
    }

    private static string CreateIdempotencyKey(string toEmail, string subject, string htmlBody)
    {
        var content = Encoding.UTF8.GetBytes($"{toEmail}\n{subject}\n{htmlBody}");
        return $"shuttle-booking-{Convert.ToHexString(SHA256.HashData(content)).ToLowerInvariant()}";
    }
}