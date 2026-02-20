using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data.Interfaces;

/// <summary>
/// Interfaccia per gestire le operazioni di accesso ai dati per gli shuttles.
/// </summary>
public interface IShuttleRepository
{
    /// <summary>
    /// Ottiene tutti gli shuttle dal database.
    /// </summary>
    /// <returns>Una lista di <see cref="Shuttle"/>.</returns>
    Task<IEnumerable<Shuttle>> GetAllShuttlesAsync();

    /// <summary>
    /// Ottiene uno shuttle tramite ID dal database.
    /// </summary>
    /// <param name="id">L'ID dello shuttle.</param>
    /// <returns>Lo <see cref="Shuttle"/> relativo all'ID fornito, se trovato; altrimenti, <c>null</c>.</returns>
    Task<Shuttle> GetShuttleByIdAsync(int id);

    /// <summary>
    /// Crea un nuovo shuttle nel database.
    /// </summary>
    /// <param name="shuttle">I dati dello shuttle da creare.</param>
    /// <returns>Il <see cref="Shuttle"/> creato.</returns>
    Task<Shuttle> CreateShuttleAsync(Shuttle shuttle);

    /// <summary>
    /// Aggiorna uno shuttle nel database.
    /// </summary>
    /// <param name="shuttle">Lo shuttle da aggiornare.</param>
    /// <returns>Lo <see cref="Shuttle"/> aggiornato.</returns>
    Task<Shuttle> UpdateShuttleAsync(Shuttle shuttle);

    /// <summary>
    /// Elimina uno shuttle tramite ID dal database.
    /// </summary>
    /// <param name="id">L'ID dello shuttle da eliminare.</param>
    /// <returns><c>true</c> se l'eliminazione è avvenuta con successo; altrimenti, <c>false</c>.</returns>
    Task<bool> DeleteShuttleAsync(int id);
}