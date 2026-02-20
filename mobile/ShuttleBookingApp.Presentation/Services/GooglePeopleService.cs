using System.Net.Http.Headers;
using System.Text.Json;
using ShuttleBookingApp.Presentation.Models;

namespace ShuttleBookingApp.Presentation.Services;

public class GooglePeopleService
{
    private readonly HttpClient _httpClient = new()
    {
        BaseAddress = new Uri("https://people.googleapis.com/v1/")
    };

    private async Task<GoogleUserInfo> GetUserContactInfo(string accessToken,
        CancellationToken cancellationToken = default)
    {
        // Configura l'intestazione dell'autorizzazione con il token di accesso
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        // Richiedi i campi specifici di cui hai bisogno
        var personFields = "phoneNumbers,addresses,names,emailAddresses";

        // Esegui la richiesta GET alla People API
        var response = await _httpClient.GetAsync($"people/me?personFields={personFields}", cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var peopleResponse = JsonSerializer.Deserialize<GoogleUserInfo>(json);
            return peopleResponse ?? new GoogleUserInfo();
        }

        // Gestisci gli errori in modo appropriato
        var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
        Console.WriteLine($"Errore nella richiesta alla Google People API: {response.StatusCode}, {errorContent}");
        return new GoogleUserInfo(); // Ritorna un oggetto vuoto invece di lanciare un'eccezione
    }

    public async Task EnrichUserInfoWithContactDetails(GoogleUserInfo userInfo, string accessToken,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var peopleResponse = await GetUserContactInfo(accessToken, cancellationToken);

            // Aggiorna le proprietà dell'utente con i dati della People API
            if (peopleResponse.PhoneNumbers is { Count: > 0 })
                userInfo.PhoneNumbers = peopleResponse.PhoneNumbers;

            if (peopleResponse.Addresses is { Count: > 0 })
                userInfo.Addresses = peopleResponse.Addresses;

            if (peopleResponse.Names is { Count: > 0 })
                userInfo.Names = peopleResponse.Names;

            if (peopleResponse.EmailAddresses is { Count: > 0 })
                userInfo.EmailAddresses = peopleResponse.EmailAddresses;

            userInfo.ResourceName = peopleResponse.ResourceName;
        }
        catch (Exception ex)
        {
            // Log dell'errore, ma continua senza interrompere il flusso di autenticazione
            Console.WriteLine($"Errore nel recupero dei dettagli di contatto: {ex.Message}");
        }
    }

    public async Task<GoogleUserInfo> GetCompleteUserInfo(string accessToken, GoogleUserInfo basicInfo = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Se non viene passato un oggetto con i dati base, createne uno nuovo
            var userInfo = basicInfo ?? new GoogleUserInfo();

            // Ottieni i dati dalla People API
            var peopleInfo = await GetUserContactInfo(accessToken, cancellationToken);

            // Aggiorna le proprietà dell'utente con i dati della People API
            if (peopleInfo.PhoneNumbers is { Count: > 0 })
                userInfo.PhoneNumbers = peopleInfo.PhoneNumbers;

            if (peopleInfo.Addresses is { Count: > 0 })
                userInfo.Addresses = peopleInfo.Addresses;

            if (peopleInfo.Names is { Count: > 0 })
                userInfo.Names = peopleInfo.Names;

            if (peopleInfo.EmailAddresses is { Count: > 0 })
                userInfo.EmailAddresses = peopleInfo.EmailAddresses;

            userInfo.ResourceName = peopleInfo.ResourceName;

            return userInfo;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore nel recupero delle informazioni utente complete: {ex.Message}");
            return basicInfo ?? new GoogleUserInfo();
        }
    }
}