using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Interfaces;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
/// Controller per gestire le operazioni sugli Shuttles.
/// </summary>
[ApiController]
[Route("[controller]")]
public class ShuttlesController(IShuttleService shuttleService) : ControllerBase
{
    /// <summary>
    /// Ottiene tutti gli shuttle.
    /// </summary>
    /// <returns>Una lista di shuttles.</returns>
    [HttpGet("GetShuttles")]
    public async Task<IActionResult> GetAllShuttles()
    {
        var shuttles = await shuttleService.GetAllShuttlesAsync();
        return Ok(shuttles);
    }

    /// <summary>
    /// Ottiene uno shuttle tramite ID.
    /// </summary>
    /// <param name="id">L'ID dello shuttle.</param>
    /// <returns>Lo shuttle relativo all'ID fornito.</returns>
    [HttpGet("GetShuttle/{id:int}")]
    public async Task<IActionResult> GetShuttleById(int id)
    {
        var shuttle = await shuttleService.GetShuttleByIdAsync(id);

        if (shuttle == null)
        {
            return NotFound(new { Message = $"Shuttle con ID {id} non trovato." });
        }

        return Ok(shuttle);
    }

    /// <summary>
    /// Crea un nuovo shuttle.
    /// </summary>
    /// <param name="createShuttleDto">I dati dello shuttle da creare.</param>
    /// <returns>Lo shuttle creato.</returns>
    [HttpPost("CreateShuttle")]
    public async Task<IActionResult> CreateShuttle([FromBody] CreateShuttleDto? createShuttleDto)
    {
        if (createShuttleDto == null)
        {
            return BadRequest("Dati dello shuttle nulli.");
        }

        var createdShuttle = await shuttleService.CreateShuttleAsync(createShuttleDto);
        return CreatedAtAction(nameof(GetShuttleById), new { id = createdShuttle.Id }, createdShuttle);
    }

    /// <summary>
    /// Aggiorna la capacità di uno shuttle.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da aggiornare.</param>
    /// <param name="newCapacity">La nuova capacità dello shuttle.</param>
    /// <returns>Lo shuttle aggiornato.</returns>
    [HttpPut("UpdateShuttle/{id:int}")]
    public async Task<IActionResult> UpdateShuttle(int id, [FromBody] int newCapacity)
    {
        if (newCapacity is < 1 or > 100)
        {
            return BadRequest("La capacità deve essere maggiore di zero e minore di 101.");
        }

        var updatedShuttle = await shuttleService.UpdateShuttleCapacityAsync(id, newCapacity);

        if (updatedShuttle == null)
        {
            return NotFound(new { Message = $"Shuttle con ID {id} non trovato." });
        }

        return Ok(updatedShuttle);
    }

    /// <summary>
    /// Elimina uno shuttle tramite ID.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da eliminare.</param>
    /// <returns>Un'azione con il risultato dell'eliminazione.</returns>
    [HttpDelete("DeleteShuttle/{id:int}")]
    public async Task<IActionResult> DeleteShuttle(int id)
    {
        var shuttle = await shuttleService.GetShuttleByIdAsync(id);

        if (shuttle == null)
        {
            return NotFound(new { Message = $"Shuttle con ID {id} non trovato." });
        }

        var success = await shuttleService.DeleteShuttleAsync(id);

        return Ok(success);
    }
}