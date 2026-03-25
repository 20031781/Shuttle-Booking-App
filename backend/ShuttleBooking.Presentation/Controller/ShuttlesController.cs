using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Business.Models;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Controller per gestire le operazioni sugli Shuttles.
/// </summary>
[ApiController]
[Route("[controller]")]
public class ShuttlesController(IShuttleService shuttleService) : ControllerBase
{
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
    [ProducesResponseType(typeof(ShuttleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [HttpPost("CreateShuttle")]
    public async Task<ActionResult<ShuttleDto>> CreateShuttle([FromBody] CreateShuttleDto? createShuttleDto)
    {
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
    ///     Aggiorna la capacità di uno shuttle.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da aggiornare.</param>
    /// <param name="request">La nuova capacità dello shuttle.</param>
    /// <returns>Lo shuttle aggiornato.</returns>
    [ProducesResponseType(typeof(ShuttleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [HttpPut("UpdateShuttle/{id:int}")]
    public async Task<ActionResult<ShuttleDto>> UpdateShuttle(int id, [FromBody] UpdateShuttleCapacityRequest request)
    {
        var updatedShuttle = await shuttleService.UpdateShuttleCapacityAsync(id, request.Capacity);
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
    [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [HttpDelete("DeleteShuttle/{id:int}")]
    public async Task<IActionResult> DeleteShuttle(int id)
    {
        var success = await shuttleService.DeleteShuttleAsync(id);
        if (success) return Ok(true);

        return NotFound(new ErrorResponse
        {
            Message = $"Shuttle con ID {id} non trovato.",
            StatusCode = StatusCodes.Status404NotFound
        });
    }
}