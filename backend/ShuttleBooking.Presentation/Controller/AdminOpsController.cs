using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.Auth;
using ShuttleBooking.Business.Services;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Endpoint operativi per dashboard admin (KPI, stato sistema, gestione ruoli).
/// </summary>
[ApiController]
[Route("[controller]")]
[Authorize(Roles = Roles.Admin)]
public class AdminOpsController(
    IAdminOpsService adminOpsService,
    IUserService userService) : ControllerBase
{
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
        var health = await adminOpsService.GetHealthAsync(cancellationToken);
        return Ok(health);
    }

    /// <summary>
    ///     Restituisce i ruoli assegnati all'utente con l'email indicata.
    /// </summary>
    [HttpGet("Roles/{email}")]
    [ProducesResponseType(typeof(UserRolesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRolesDto>> GetRoles(string email)
    {
        try
        {
            return Ok(await userService.GetRolesAsync(email));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse { Message = ex.Message, StatusCode = StatusCodes.Status404NotFound });
        }
    }

    /// <summary>
    ///     Assegna un ruolo (Admin/Manager) all'utente con l'email indicata.
    /// </summary>
    [HttpPost("Roles/Assign")]
    [ProducesResponseType(typeof(UserRolesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRolesDto>> AssignRole([FromBody] AssignRoleRequest request)
    {
        try
        {
            return Ok(await userService.AssignRoleAsync(request.Email, request.Role));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message, StatusCode = StatusCodes.Status400BadRequest });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse { Message = ex.Message, StatusCode = StatusCodes.Status404NotFound });
        }
    }

    /// <summary>
    ///     Revoca un ruolo (Admin/Manager) dall'utente con l'email indicata.
    /// </summary>
    [HttpPost("Roles/Revoke")]
    [ProducesResponseType(typeof(UserRolesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserRolesDto>> RevokeRole([FromBody] AssignRoleRequest request)
    {
        try
        {
            return Ok(await userService.RevokeRoleAsync(request.Email, request.Role));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse { Message = ex.Message, StatusCode = StatusCodes.Status400BadRequest });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse { Message = ex.Message, StatusCode = StatusCodes.Status404NotFound });
        }
    }
}