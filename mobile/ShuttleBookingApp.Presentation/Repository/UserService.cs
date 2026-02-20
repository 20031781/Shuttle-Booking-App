using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ShuttleBookingApp.Business.Models;
using ShuttleBookingApp.Presentation.Models;
using ShuttleBookingApp.Presentation.Services;

namespace ShuttleBookingApp.Presentation.Repository;

public class UserService : IUserRepository
{
    // Url base dell'API - può essere modificata in base all'ambiente
    private const string BaseApiUrl = "https://localhost:5001/api";

    private static readonly HttpClient HttpClient = new()
    {
        BaseAddress = new Uri(BaseApiUrl)
    };

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private static readonly JsonSerializerOptions DeserializationOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly GooglePeopleService _googlePeopleService = new();

    public async Task<User?> Login(string email, string password, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
                throw new ArgumentException("Email e password sono richiesti");

            HttpClient.DefaultRequestHeaders.Accept.Clear();
            HttpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var url = $"user/login{email}/{password}";

            var response = await HttpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode) return null;

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var user = JsonSerializer.Deserialize<User>(content, DeserializationOptions);

            return user;
        }
        catch (OperationCanceledException)
        {
            // L'operazione è stata annullata, propaga l'eccezione
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore durante il login: {ex.Message}");
            return null;
        }
    }

    public async Task<User?> GetUserByEmail(string email, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(email))
                throw new ArgumentException("Email è richiesta");

            HttpClient.DefaultRequestHeaders.Accept.Clear();
            HttpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            // Corretto il percorso dell'API per ottenere l'utente tramite email
            var url = $"user/byEmail/{email}";

            var response = await HttpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode) return null;
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var user = JsonSerializer.Deserialize<User>(content, DeserializationOptions);
            return user;
        }
        catch (OperationCanceledException)
        {
            // L'operazione è stata annullata, propaga l'eccezione
            throw;
        }
        catch (Exception e)
        {
            Console.WriteLine($"Errore nel recupero utente per email: {e.Message}");
            return null;
        }
    }

    public async Task<User?> LoginWithGoogle(string email, string token, User? userDetails = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(token))
                throw new ArgumentException("Email e token sono richiesti");

            // Crea un oggetto GoogleUserInfo con i dati di base
            var googleUserInfo = new GoogleUserInfo { Email = email };

            // Arricchisci l'oggetto con i dati della People API
            await _googlePeopleService.EnrichUserInfoWithContactDetails(googleUserInfo, token, cancellationToken);

            // Simuliamo una chiamata asincrona a un servizio di backend
            await Task.Delay(1000, cancellationToken);

            // In una implementazione reale, qui invieremmo il token di Google al backend
            // per verificare la sua validità con Google e recuperare o creare l'utente corrispondente

            // In un'implementazione reale:
            // using var request = new HttpRequestMessage(HttpMethod.Post, "user/LoginWithGoogle");
            // request.Content = new StringContent(JsonSerializer.Serialize(new { email, token }), Encoding.UTF8, "application/json");
            // var response = await HttpClient.SendAsync(request, cancellationToken);
            // response.EnsureSuccessStatusCode();
            // var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            // var user = JsonSerializer.Deserialize<User>(responseContent, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            // Se hai ricevuto i dettagli dell'utente dal chiamante, usali
            if (userDetails == null)
                return new User
                {
                    Id = 2,
                    Email = email,
                    FirstName = "Google",
                    LastName = "User",
                    AuthProvider = "Google",
                    // Valori basati sui dati della People API o valori di default
                    City = googleUserInfo.City,
                    Phone = googleUserInfo.Phone,
                    PhoneCountryCode = googleUserInfo.PhoneCountryCode,
                    Address = googleUserInfo.Address
                };
            // Assegna un ID simulato
            userDetails.Id = 2;

            // Aggiorna l'utente con i dati ottenuti dalla People API
            if (googleUserInfo.PhoneNumbers?.Count > 0)
            {
                userDetails.Phone = googleUserInfo.Phone;
                userDetails.PhoneCountryCode = googleUserInfo.PhoneCountryCode;
            }

            if (!(googleUserInfo.Addresses?.Count > 0)) return userDetails;

            userDetails.Address = googleUserInfo.Address;
            userDetails.City = googleUserInfo.City;

            return userDetails;

            // Altrimenti, restituisci valori di default
            // Assicurati che i campi required abbiano valori validi
        }
        catch (OperationCanceledException)
        {
            // L'operazione è stata annullata, propaga l'eccezione
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore nel login con Google: {ex.Message}");
            return null;
        }
    }

    public async Task<User> CreateUser(User? user, CancellationToken cancellationToken = default)
    {
        try
        {
            ArgumentNullException.ThrowIfNull(user);

            HttpClient.DefaultRequestHeaders.Accept.Clear();
            HttpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

            var json = JsonSerializer.Serialize(user, JsonOptions);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            // Usa l'endpoint "user/register" come richiesto
            var response = await HttpClient.PostAsync("user/register", content, cancellationToken);

            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException($"Errore dal server: {response.StatusCode}");

            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            var createdUser = JsonSerializer.Deserialize<User>(responseContent, DeserializationOptions);

            return createdUser ?? throw new InvalidOperationException("Risposta API non valida");
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or InvalidOperationException)
        {
            // Qui puoi gestire l'errore come preferisci, ad esempio:
            Console.WriteLine($"Errore durante la creazione dell'utente: {ex.Message}");
            throw; // Rilancia l'eccezione per gestirla nel chiamante
        }
    }
}