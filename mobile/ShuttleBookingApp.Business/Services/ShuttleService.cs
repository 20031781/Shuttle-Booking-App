using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using ShuttleBookingApp.Business.Endpoints;
using ShuttleBookingApp.Business.Models;

namespace ShuttleBookingApp.Business.Services;

/// <summary>
///     Servizio per interagire con l'API delle navette.
/// </summary>
public class ShuttleService
{
    private readonly HttpClient _httpClient = new();

    /// <summary>
    ///     Ottiene tutte le navette disponibili.
    /// </summary>
    /// <returns>
    ///     Una lista di oggetti <see cref="Shuttle" /> se la richiesta ha successo; altrimenti una lista vuota di
    ///     <see cref="Shuttle" />.
    /// </returns>
    public async Task<List<Shuttle>> GetAllShuttlesAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync(ShuttleEndpoints.GetAllShuttles);

            if (response.IsSuccessStatusCode)
                return await response.Content.ReadFromJsonAsync<List<Shuttle>>() ?? [];
            return [];
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore durante la richiesta degli shuttle: {ex.Message}");
            return [];
        }
    }

    /// <summary>
    ///     Ottiene una navetta specificata dall'ID.
    /// </summary>
    /// <param name="id">L'ID della navetta da ottenere.</param>
    /// <returns>
    ///     Un oggetto <see cref="Shuttle" /> se la richiesta ha successo; altrimenti <see langword="null" />.
    /// </returns>
    public async Task<Shuttle?> GetShuttleByIdAsync(string id)
    {
        var response = await _httpClient.GetAsync($"{ShuttleEndpoints.GetShuttleById.Replace("{id:int}", id)}");
        if (response.IsSuccessStatusCode) return await response.Content.ReadFromJsonAsync<Shuttle>() ?? null;
        return null;
    }

    /// <summary>
    ///     Crea una nuova navetta con i parametri specificati.
    /// </summary>
    /// <param name="name">Il nome della navetta.</param>
    /// <param name="capacity">La capacità della navetta.</param>
    /// <returns>
    ///     Un oggetto <see cref="Shuttle" /> se la creazione ha successo; altrimenti <see langword="null" />.
    /// </returns>
    public async Task<bool> CreateShuttleAsync(string name, int capacity)
    {
        try
        {
            var shuttle = new Shuttle
            {
                Name = name,
                Capacity = capacity
            };

            var response = await _httpClient.PostAsJsonAsync(ShuttleEndpoints.CreateShuttle, shuttle);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore durante la creazione dello shuttle: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    ///     Aggiorna la navetta con l'ID specificato.
    /// </summary>
    /// <param name="id">L'ID della navetta da aggiornare.</param>
    /// <param name="capacity">La nuova capacità della navetta.</param>
    /// <returns>
    ///     <see langword="true" /> se l'aggiornamento ha successo; altrimenti <see langword="false" />.
    /// </returns>
    public async Task<bool> UpdateShuttleAsync(string id, int capacity)
    {
        try
        {
            var json = JsonSerializer.Serialize(capacity);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PutAsync($"{ShuttleEndpoints.UpdateShuttle.Replace("{id:int}", id)}", content);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore durante l'aggiornamento dello shuttle: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    ///     Elimina la navetta con l'ID specificato.
    /// </summary>
    /// <param name="id">L'ID della navetta da eliminare.</param>
    /// <returns>
    ///     <see langword="true" /> se l'eliminazione ha successo; altrimenti <see langword="false" />.
    /// </returns>
    public async Task<bool> DeleteShuttleAsync(string id)
    {
        try
        {
            var response = await _httpClient.DeleteAsync($"{ShuttleEndpoints.DeleteShuttle.Replace("{id:int}", id)}");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore durante l'eliminazione dello shuttle: {ex.Message}");
            return false;
        }
    }
}