using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.Admin;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Controller per gestire le operazioni sugli Shuttles.
/// </summary>
[ApiController]
[Route("[controller]")]
public class ShuttlesController(
    IShuttleService shuttleService,
    IOptions<AdminDashboardOptions> adminOptionsAccessor,
    IOptions<ManagerDashboardOptions> managerOptionsAccessor) : ControllerBase
{
    private readonly AdminDashboardOptions _adminOptions = adminOptionsAccessor.Value;
    private readonly ManagerDashboardOptions _managerOptions = managerOptionsAccessor.Value;

    /// <summary>
    ///     Ottiene tutti gli shuttle.
    /// </summary>
    /// <param name="date">Data opzionale per calcolare i posti residui.</param>
    /// <returns>Una lista di shuttles.</returns>
    [ProducesResponseType(typeof(IEnumerable<ShuttleDto>), StatusCodes.Status200OK)]
    [HttpGet("GetShuttles")]
    public async Task<ActionResult<IEnumerable<ShuttleDto>>> GetAllShuttles([FromQuery] DateTime? date = null)
    {
        var shuttles = await shuttleService.GetAllShuttlesAsync(date);
        return Ok(shuttles);
    }

    /// <summary>
    ///     Ottiene uno shuttle tramite ID.
    /// </summary>
    /// <param name="id">L'ID dello shuttle.</param>
    /// <returns>Lo shuttle relativo all'ID fornito.</returns>
    [ProducesResponseType(typeof(ShuttleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [HttpGet("GetShuttle/{id:int}")]
    public async Task<ActionResult<ShuttleDto>> GetShuttleById(int id)
    {
        var shuttle = await shuttleService.GetShuttleByIdAsync(id);
        if (shuttle != null) return Ok(shuttle);

        return NotFound(new ErrorResponse
        {
            Message = $"Shuttle con ID {id} non trovato.",
            StatusCode = StatusCodes.Status404NotFound
        });
    }

    /// <summary>
    ///     Crea un nuovo shuttle.
    /// </summary>
    /// <param name="createShuttleDto">I dati dello shuttle da creare.</param>
    /// <returns>Lo shuttle creato.</returns>
    [Authorize]
    [ProducesResponseType(typeof(ShuttleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [HttpPost("CreateShuttle")]
    public async Task<ActionResult<ShuttleDto>> CreateShuttle([FromBody] CreateShuttleDto? createShuttleDto)
    {
        if (!IsAllowedManagerOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponse
            {
                Message = "Accesso non autorizzato alla gestione shuttle.",
                StatusCode = StatusCodes.Status403Forbidden
            });

        if (createShuttleDto == null)
            return BadRequest(new ErrorResponse
            {
                Message = "Dati dello shuttle nulli.",
                StatusCode = StatusCodes.Status400BadRequest
            });

        var createdShuttle = await shuttleService.CreateShuttleAsync(createShuttleDto);
        return CreatedAtAction(nameof(GetShuttleById), new { id = createdShuttle.Id }, createdShuttle);
    }

    /// <summary>
    ///     Aggiorna nome e capacità di uno shuttle.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da aggiornare.</param>
    /// <param name="request">Nuovi dettagli shuttle.</param>
    [Authorize]
    [ProducesResponseType(typeof(ShuttleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [HttpPut("UpdateShuttleDetails/{id:int}")]
    public async Task<ActionResult<ShuttleDto>> UpdateShuttleDetails(
        int id,
        [FromBody] UpdateShuttleDetailsRequest request)
    {
        if (!IsAllowedManagerOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponse
            {
                Message = "Accesso non autorizzato alla gestione shuttle.",
                StatusCode = StatusCodes.Status403Forbidden
            });

        var updatedShuttle = await shuttleService.UpdateShuttleDetailsAsync(
            id,
            request.Name,
            request.Capacity,
            request.MeetingAtUtc);
        if (updatedShuttle != null) return Ok(updatedShuttle);

        return NotFound(new ErrorResponse
        {
            Message = $"Shuttle con ID {id} non trovato.",
            StatusCode = StatusCodes.Status404NotFound
        });
    }

    /// <summary>
    ///     Elimina uno shuttle tramite ID.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da eliminare.</param>
    /// <returns>Un'azione con il risultato dell'eliminazione.</returns>
    [Authorize]
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [HttpDelete("DeleteShuttle/{id:int}")]
    public async Task<IActionResult> DeleteShuttle(int id)
    {
        if (!IsAllowedManagerOrAdmin())
            return StatusCode(StatusCodes.Status403Forbidden, new ErrorResponse
            {
                Message = "Accesso non autorizzato alla gestione shuttle.",
                StatusCode = StatusCodes.Status403Forbidden
            });

        var success = await shuttleService.DeleteShuttleAsync(id);
        if (success) return Ok(true);

        return NotFound(new ErrorResponse
        {
            Message = $"Shuttle con ID {id} non trovato.",
            StatusCode = StatusCodes.Status404NotFound
        });
    }

    private bool IsAllowedManagerOrAdmin()
    {
        var email = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        if (string.IsNullOrWhiteSpace(email)) return false;

        return IsAllowedEmail(email, _adminOptions.AllowedEmails) ||
               IsAllowedEmail(email, _managerOptions.AllowedEmails);
    }

    private static bool IsAllowedEmail(string email, IEnumerable<string> allowedEmails) =>
        allowedEmails.Any(allowedEmail => string.Equals(allowedEmail, email, StringComparison.OrdinalIgnoreCase));
}