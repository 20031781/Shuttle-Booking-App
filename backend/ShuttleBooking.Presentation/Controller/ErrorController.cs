using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.Models;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Endpoint centralizzato per la gestione delle eccezioni non gestite.
/// </summary>
[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public class ErrorController : ControllerBase
{
    private readonly ILogger<ErrorController> _logger;

    /// <summary>
    ///     Inizializza un nuovo <see cref="ErrorController" />.
    /// </summary>
    /// <param name="logger">Logger applicativo.</param>
    public ErrorController(ILogger<ErrorController> logger) => _logger = logger;

    /// <summary>
    ///     Restituisce la risposta standard per errori interni.
    /// </summary>
    /// <returns>Payload errore con codice 500.</returns>
    [Route("/error")]
    public IActionResult HandleError()
    {
        var exception = HttpContext.Features.Get<IExceptionHandlerFeature>()?.Error;
        var traceId = HttpContext.TraceIdentifier;

        if (exception != null) _logger.LogError(exception, "Eccezione non gestita. TraceId: {TraceId}", traceId);

        return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
        {
            Message = $"Si è verificato un errore interno. TraceId: {traceId}",
            StatusCode = StatusCodes.Status500InternalServerError,
            ErrorCode = "INTERNAL_SERVER_ERROR"
        });
    }
}