using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.Models;

namespace ShuttleBooking.Presentation.Controller;

[ApiController]
[ApiExplorerSettings(IgnoreApi = true)]
public class ErrorController : ControllerBase
{
    private readonly ILogger<ErrorController> _logger;

    public ErrorController(ILogger<ErrorController> logger)
    {
        _logger = logger;
    }

    [Route("/error")]
    public IActionResult HandleError()
    {
        var exception = HttpContext.Features.Get<IExceptionHandlerFeature>()?.Error;
        
        if (exception != null)
        {
            _logger.LogError(exception, "Eccezione non gestita");
        }
        
        return StatusCode(StatusCodes.Status500InternalServerError, new ErrorResponse
        {
            Message = "Si è verificato un errore interno. Per favore riprova più tardi.",
            StatusCode = StatusCodes.Status500InternalServerError
        });
    }
}
