using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using ShuttleBooking.Business.Models;

namespace ShuttleBooking.Presentation.Middleware;

public class RateLimitingMiddleware
{
    // Cache per tracciare le richieste per IP
    private static readonly ConcurrentDictionary<string, Queue<DateTime>> RequestsPerIp = new();
    private readonly ILogger<RateLimitingMiddleware> _logger;

    // Configurazione
    private const int MaxRequestsPerMinute = 60;
    private readonly RequestDelegate _next;

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientIp = GetClientIpAddress(context);

        if (IsRateLimited(clientIp))
        {
            _logger.LogWarning("Rate limit superato per IP: {ClientIp}", clientIp);

            context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
            context.Response.ContentType = "application/json";

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
        // Ottiene o crea una coda per l'IP
        var requestQueue = RequestsPerIp.GetOrAdd(clientIp, _ => new Queue<DateTime>());

        // Rimuove le richieste più vecchie di un minuto
        var now = DateTime.UtcNow;
        while (requestQueue.Count > 0 && (now - requestQueue.Peek()).TotalMinutes >= 1) requestQueue.Dequeue();

        // Se ci sono già troppe richieste, limita
        if (requestQueue.Count >= MaxRequestsPerMinute) return true;

        // Aggiunge la nuova richiesta
        requestQueue.Enqueue(now);
        return false;
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress?.ToString();

        // Se dietro un proxy, prova a ottenere l'IP reale
        var forwardedIp = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedIp)) ip = forwardedIp.Split(',')[0].Trim();

        return ip ?? "unknown";
    }
}

// Estensione per registrare il middleware
public static class RateLimitingMiddlewareExtensions
{
    public static IApplicationBuilder UseRateLimiting(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RateLimitingMiddleware>();
    }
}