using ShuttleBooking.Business.DTOs;

namespace ShuttleBooking.Business.Interfaces;

/// <summary>
///     Interfaccia per gestire le operazioni sugli Shuttles.
/// </summary>
public interface IShuttleService
{
    /// <summary>
    ///     Ottiene tutti gli shuttle.
    /// </summary>
    /// <returns>Una lista di <see cref="ShuttleDto" />.</returns>
    Task<IEnumerable<ShuttleDto>> GetAllShuttlesAsync(DateTime? date = null);

    /// <summary>
    ///     Ottiene uno shuttle tramite ID.
    /// </summary>
    /// <param name="id">L'ID dello shuttle.</param>
    /// <returns>Lo <see cref="ShuttleDto" /> relativo all'ID fornito, se trovato; altrimenti, <c>null</c>.</returns>
    Task<ShuttleDto?> GetShuttleByIdAsync(int id);

    /// <summary>
    ///     Crea un nuovo shuttle.
    /// </summary>
    /// <param name="shuttleDto">I dati dello shuttle da creare.</param>
    /// <returns>Il <see cref="ShuttleDto" /> creato.</returns>
    Task<ShuttleDto> CreateShuttleAsync(CreateShuttleDto shuttleDto);

    /// <summary>
    ///     Aggiorna nome e capacità di uno shuttle.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da aggiornare.</param>
    /// <param name="name">Il nuovo nome dello shuttle.</param>
    /// <param name="capacity">La nuova capacità.</param>
    /// <param name="meetingAtUtc">Data/ora ritrovo in UTC.</param>
    /// <returns>Lo shuttle aggiornato, se trovato; altrimenti <c>null</c>.</returns>
    Task<ShuttleDto?> UpdateShuttleDetailsAsync(int id, string name, int capacity, DateTime meetingAtUtc);

    /// <summary>
    ///     Elimina uno shuttle tramite ID.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da eliminare.</param>
    /// <returns><c>true</c> se l'eliminazione è avvenuta con successo; altrimenti, <c>false</c>.</returns>
    Task<bool> DeleteShuttleAsync(int id);
}