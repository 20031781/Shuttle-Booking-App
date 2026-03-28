using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Services;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Endpoint operativi per dashboard admin (KPI e stato sistema).
/// </summary>
[ApiController]
[Route("[controller]")]
[Authorize]
public class AdminOpsController(
    IAdminOpsService adminOpsService,
    IOptions<AdminDashboardOptions> adminOptionsAccessor) : ControllerBase
{
    private readonly AdminDashboardOptions _adminOptions = adminOptionsAccessor.Value;

    /// <summary>
    ///     Restituisce KPI operativi del giorno richiesto.
    /// </summary>
    [HttpGet("Overview")]
    [ProducesResponseType(typeof(AdminOverviewDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminOverviewDto>> GetOverview([FromQuery] DateTime? date,
        CancellationToken cancellationToken)
    {
        if (!IsAdminUser())
            return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponse
            {
                Message = "Accesso admin non autorizzato.",
                StatusCode = StatusCodes.Status403Forbidden
            });

        var overview = await adminOpsService.GetOverviewAsync(date, cancellationToken);
        return Ok(overview);
    }

    /// <summary>
    ///     Restituisce stato operativo API/DB/Push per monitoring.
    /// </summary>
    [HttpGet("Health")]
    [ProducesResponseType(typeof(AdminHealthDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<AdminHealthDto>> GetHealth(CancellationToken cancellationToken)
    {
        if (!IsAdminUser())
            return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponse
            {
                Message = "Accesso admin non autorizzato.",
                StatusCode = StatusCodes.Status403Forbidden
            });

        var health = await adminOpsService.GetHealthAsync(cancellationToken);
        return Ok(health);
    }

    private bool IsAdminUser()
    {
        var email = User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirstValue(JwtRegisteredClaimNames.Email)
                    ?? User.FindFirstValue("email");

        if (string.IsNullOrWhiteSpace(email)) return false;

        if (_adminOptions.AllowedEmails.Count == 0) return false;

        return _adminOptions.AllowedEmails.Any(allowedEmail =>
            string.Equals(allowedEmail, email, StringComparison.OrdinalIgnoreCase));
    }
}