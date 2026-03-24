using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Options;
using ShuttleBooking.Business.Models;

namespace ShuttleBooking.Presentation.Middleware;

/// <summary>
///     Opzioni di configurazione del rate limiting.
/// </summary>
public sealed class RateLimitingOptions
{
    /// <summary>
    ///     Numero massimo di richieste consentite in un minuto per singolo IP.
    /// </summary>
    public int MaxRequestsPerMinute { get; init; } = 60;
}

/// <summary>
///     Middleware per limitare il numero di richieste per IP in una finestra temporale di un minuto.
/// </summary>
public class RateLimitingMiddleware
{
    private static readonly ConcurrentDictionary<string, RequestBucket> RequestsPerIp = new();
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly RequestDelegate _next;
    private readonly RateLimitingOptions _options;

    /// <summary>
    ///     Inizializza il middleware di rate limiting.
    /// </summary>
    /// <param name="next">Middleware successivo nella pipeline.</param>
    /// <param name="logger">Logger applicativo.</param>
    /// <param name="options">Opzioni di configurazione del rate limiting.</param>
    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IOptions<RateLimitingOptions> options)
    {
        _next = next;
        _logger = logger;
        _options = options.Value;
    }

    /// <summary>
    ///     Esegue il middleware e blocca la richiesta quando il limite è superato.
    /// </summary>
    /// <param name="context">Contesto HTTP corrente.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = GetClientIpAddress(context);
        if (IsRateLimited(clientIp))
        {
            _logger.LogWarning("Rate limit superato per IP: {ClientIp}", clientIp);

            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.ContentType = "application/json";
            context.Response.Headers["Retry-After"] = "60";

            var response = new ErrorResponse
            {
                Message = "Troppe richieste. Per favore riprova più tardi.",
                StatusCode = StatusCodes.Status429TooManyRequests,
                ErrorCode = "RATE_LIMIT_EXCEEDED"
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            return;
        }

        await _next(context);
    }

    private bool IsRateLimited(string clientIp)
    {
        var requestBucket = RequestsPerIp.GetOrAdd(clientIp, static _ => new RequestBucket());
        var now = DateTime.UtcNow;

        lock (requestBucket.SyncLock)
        {
            while (requestBucket.Requests.Count > 0 &&
                   (now - requestBucket.Requests.Peek()).TotalMinutes >= 1)
                requestBucket.Requests.Dequeue();

            if (requestBucket.Requests.Count >= _options.MaxRequestsPerMinute) return true;

            requestBucket.Requests.Enqueue(now);
            return false;
        }
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString();

        var forwardedIp = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedIp)) ip = forwardedIp.Split(',')[0].Trim();

        return string.IsNullOrWhiteSpace(ip) ? "unknown" : ip;
    }

    private sealed class RequestBucket
    {
        public Queue<DateTime> Requests { get; } = new();
        public object SyncLock { get; } = new();
    }
}

/// <summary>
///     Metodi di estensione per registrare il rate limiting middleware.
/// </summary>
public static class RateLimitingMiddlewareExtensions
{
    /// <summary>
    ///     Registra il middleware di rate limiting nella pipeline HTTP.
    /// </summary>
    /// <param name="builder">Builder applicativo.</param>
    /// <returns>Il builder aggiornato.</returns>
    public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder builder) =>
        builder.UseMiddleware<RateLimitingMiddleware>();
}