using System.ComponentModel;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Windows.Input;
using Google.Apis.Auth.OAuth2;
using Google.Apis.PeopleService.v1;
using Google.Apis.Services;
using ShuttleBookingApp.Business.Models;
using ShuttleBookingApp.Presentation.MetodiComuni;
using ShuttleBookingApp.Presentation.Models;
using ShuttleBookingApp.Presentation.Pages;
using ShuttleBookingApp.Presentation.Repository;

namespace ShuttleBookingApp.Presentation.ViewModels;

public sealed partial class LoginViewModel : INotifyPropertyChanged
{
    private readonly UserService _userRepository;

    private CancellationTokenSource? _cts;
    private string _email = string.Empty;
    private bool _isBusy;
    private string _password = string.Empty;

    public LoginViewModel()
    {
        _userRepository = new UserService();
        LoginCommand = new Command(ExecuteLoginCommand, () => !IsBusy);
        CreateAccountCommand = new Command(ExecuteCreateAccountCommand, () => !IsBusy);
        GoogleLoginCommand = new Command(ExecuteGoogleLoginCommand, () => !IsBusy);
    }

    public string Email
    {
        get => _email;
        set
        {
            _email = value;
            OnPropertyChanged();
        }
    }

    public string Password
    {
        get => _password;
        set
        {
            _password = value;
            OnPropertyChanged();
        }
    }

    public bool IsBusy
    {
        get => _isBusy;
        set
        {
            _isBusy = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(IsNotBusy));
            // Forza aggiornamento dei CanExecute
            (LoginCommand as Command)?.ChangeCanExecute();
            (CreateAccountCommand as Command)?.ChangeCanExecute();
            (GoogleLoginCommand as Command)?.ChangeCanExecute();
        }
    }

    public bool IsNotBusy => !IsBusy;

    public ICommand LoginCommand { get; }
    public ICommand CreateAccountCommand { get; }
    public ICommand GoogleLoginCommand { get; }

    public event PropertyChangedEventHandler? PropertyChanged;

    private async void ExecuteLoginCommand()
    {
        try
        {
            await PerformLoginOperation();
        }
        catch (Exception e)
        {
            await DialogHelper.ShowAlertAsync("Errore", e.Message);
        }
    }

    private async void ExecuteCreateAccountCommand()
    {
        try
        {
            await CreateStandardAccount();
        }
        catch (Exception e)
        {
            await DialogHelper.ShowAlertAsync("Errore", e.Message);
        }
    }

    private async void ExecuteGoogleLoginCommand()
    {
        try
        {
            await GoogleLogin();
        }
        catch (Exception e)
        {
            await DialogHelper.ShowAlertAsync("Errore", e.Message);
        }
    }

    private async Task PerformLoginOperation()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;

            // Crea un nuovo CancellationTokenSource con un timeout di 10 secondi.
            _cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

            // Validazione
            var email = Email.Trim();
            var password = Password;

            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            {
                await DialogHelper.ShowAlertAsync("Errore", "Sono richiesti tutti i campi");
                return;
            }

            // Validazione email con regex
            if (!EmailRegex().IsMatch(email))
            {
                await DialogHelper.ShowAlertAsync("Errore", "Inserire un indirizzo email valido");
                return;
            }

            // Controlli aggiuntivi sull'email
            if (email.StartsWith('.') || email.EndsWith('.'))
            {
                await DialogHelper.ShowAlertAsync("Errore", "L'indirizzo email contiene punti in posizione non valida");
                return;
            }

            // Verifica che il dominio abbia almeno una parte
            var domainParts = email.Split('@')[1].Split('.');
            if (domainParts.Length < 2 || domainParts.Any(string.IsNullOrWhiteSpace))
            {
                await DialogHelper.ShowAlertAsync("Errore", "Il dominio dell'email non è valido");
                return;
            }

            if (password.Length < 8)
            {
                await DialogHelper.ShowAlertAsync("Errore", "La password è troppo corta");
                return;
            }

            // var user = await _userRepository.Login(email, password, _cts.Token);
            // if (user != null)
            // {
            //     User = user; // Assegnazione alla proprietà User che notificherà i binding
            //     await NavigateToMainPage();
            // }

            // TODO: Mock user for debugging - remove when API endpoint is ready
            var user = new User
            {
                Id = 2,
                Email = email,
                FirstName = "Google",
                LastName = "User",
                AuthProvider = "Google",
                City = "città",
                Phone = "0000000000",
                PhoneCountryCode = "+39"
            };

            // Salva il token di sessione in modo sicuro
            var mockToken = "mock_auth_token_123456"; // In produzione, questo sarà un token JWT reale
            await SecureStorage.Default.SetAsync("user_token", mockToken);

            // Salva le informazioni utente non sensibili
            Preferences.Default.Set("user_id", user.Id.ToString());
            Preferences.Default.Set("user_email", user.Email);
            Preferences.Default.Set("user_name", $"{user.FirstName} {user.LastName}");

            // Naviga alla pagina principale
            await NavigateToMainPage();
        }
        catch (OperationCanceledException)
        {
            await DialogHelper.ShowAlertAsync("Attenzione",
                "L'operazione è stata annullata o è scaduto il tempo massimo");
        }
        catch (Exception ex)
        {
            await DialogHelper.ShowAlertAsync("Errore", ex.Message);
        }
        finally
        {
            IsBusy = false;
            _cts?.Dispose();
            _cts = null;
        }
    }

    private async Task CreateStandardAccount()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;

            // Qui andrà la logica per creare un nuovo account
            // Per ora mostriamo solo un alert
            await DialogHelper.ShowAlertAsync("Info", "Funzionalità di registrazione non ancora implementata");

            // In futuro, qui potresti navigare a una pagina di registrazione:
            // await Shell.Current.GoToAsync("//RegisterPage");
        }
        catch (Exception ex)
        {
            await DialogHelper.ShowAlertAsync("Errore", ex.Message);
        }
        finally
        {
            IsBusy = false;
        }
    }

    private async Task GoogleLogin()
    {
        if (IsBusy) return;

        try
        {
            IsBusy = true;

            // Crea un nuovo CancellationTokenSource con un timeout di 20 secondi
            _cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));

            // URL di callback a cui verrà reindirizzato dopo l'autenticazione
            const string callbackUrl = "shuttlebookingapp://oauth2redirect/";

            // Scopes per richiedere accesso a informazioni specifiche dell'utente
            string[] scopes =
            [
                "openid",
                "profile",
                "email",
                "https://www.googleapis.com/auth/contacts.readonly", // Per i numeri di telefono
                "https://www.googleapis.com/auth/user.addresses.read" // Per gli indirizzi
            ];

            // Client ID differenti per piattaforma
            // Configurazione specifica per piattaforma
            var clientId =
                DeviceInfo.Platform == DevicePlatform.iOS
                    ? "IL_TUO_CLIENT_ID_IOS.apps.googleusercontent.com"
                    : "1069872727435-97cdhrbeeomt8sclk139trvfbmnu6604.apps.googleusercontent.com"; // Android.

            // Genera PKCE challenge per una maggiore sicurezza
            // Code Verifier - una stringa casuale di 43-128 caratteri
            var codeVerifier = GenerateCodeVerifier();
            // Code Challenge - l'hash SHA256 del Code Verifier, codificato in Base64Url
            var codeChallenge = GenerateCodeChallenge(codeVerifier);

            // Generate a random state value to protect against CSRF
            var state = Guid.NewGuid().ToString("N");

            // Salva codeVerifier in SecureStorage per poterlo recuperare dopo il redirect
            await SecureStorage.Default.SetAsync("pkce_code_verifier", codeVerifier);
            await SecureStorage.Default.SetAsync("pkce_state", state);

            // Costruiamo l'URL di autenticazione Google con PKCE
            var authUrl = new Uri(
                $"https://accounts.google.com/o/oauth2/v2/auth" +
                $"?client_id={Uri.EscapeDataString(clientId)}" +
                $"&redirect_uri={Uri.EscapeDataString(callbackUrl)}" +
                $"&response_type=code" +
                $"&code_challenge={Uri.EscapeDataString(codeChallenge)}" +
                $"&code_challenge_method=S256" +
                $"&state={Uri.EscapeDataString(state)}" +
                $"&scope={Uri.EscapeDataString(string.Join(" ", scopes))}"
            );

            // Avviamo il processo di autenticazione
            var authResult = await WebAuthenticator.Default.AuthenticateAsync(authUrl, new Uri(callbackUrl));

            // Verifica che lo stato restituito corrisponda a quello che abbiamo inviato
            var savedState = await SecureStorage.Default.GetAsync("pkce_state");
            if (authResult.Properties.TryGetValue("state", out var returnedState) &&
                !string.IsNullOrEmpty(savedState) && savedState != returnedState)
            {
                await DialogHelper.ShowAlertAsync("Errore", "Verifica di sicurezza fallita");
                return;
            }

            // Otteniamo il codice di autorizzazione
            if (!authResult.Properties.TryGetValue("code", out var authCode) || string.IsNullOrEmpty(authCode))
            {
                await DialogHelper.ShowAlertAsync("Errore", "Autenticazione fallita - codice non ricevuto");
                return;
            }

            // Recupera il code verifier salvato precedentemente
            var savedCodeVerifier = await SecureStorage.Default.GetAsync("pkce_code_verifier");
            if (string.IsNullOrEmpty(savedCodeVerifier))
            {
                await DialogHelper.ShowAlertAsync("Errore", "Code verifier mancante");
                return;
            }

            // Scambia il codice di autorizzazione con un token di accesso
            var accessToken = await ExchangeCodeForTokenAsync(clientId, authCode, callbackUrl, savedCodeVerifier);

            if (string.IsNullOrEmpty(accessToken))
            {
                await DialogHelper.ShowAlertAsync("Errore", "Scambio del codice di autorizzazione fallito");
                return;
            }

            // Ottieni informazioni dell'utente Google con dati estesi
            var googleUserInfo = await GetGoogleUserInfo(accessToken);
            if (googleUserInfo == null)
            {
                await DialogHelper.ShowAlertAsync("Errore", "Impossibile ottenere i dati dell'utente");
                return;
            }

            // Verifica se l'utente esiste già nel database
            var existingUser = await _userRepository.GetUserByEmail(googleUserInfo.Email, _cts.Token);

            var isNewUser = false;
            bool needsProfileCompletion;

            if (existingUser == null)
            {
                isNewUser = true;

                // Verifica se mancano dati obbligatori da Google
                var hasGoogleCity = !string.IsNullOrEmpty(googleUserInfo.City);
                var hasGooglePhoneCountryCode = !string.IsNullOrEmpty(googleUserInfo.PhoneCountryCode);
                needsProfileCompletion = !hasGoogleCity || !hasGooglePhoneCountryCode;

                // L'utente non esiste, quindi lo creiamo con i dati disponibili
                // Usiamo valori temporanei per i campi required che mancano
                var newUser = new User
                {
                    Email = googleUserInfo.Email,
                    FirstName = googleUserInfo.GivenName,
                    LastName = googleUserInfo.FamilyName,
                    CreatedAt = DateTime.UtcNow,
                    AuthProvider = "Google",
                    ProfilePicture = googleUserInfo.Picture,
                    // Per i campi opzionali prendiamo direttamente il valore
                    Phone = googleUserInfo.Phone,
                    Address = googleUserInfo.Address,
                    // Per i campi required dobbiamo garantire un valore
                    PhoneCountryCode = hasGooglePhoneCountryCode ? googleUserInfo.PhoneCountryCode : "+39",
                    City = hasGoogleCity ? googleUserInfo.City : "Roma"
                };

                try
                {
                    // Registra il nuovo utente nel database tramite l'endpoint "user/register"
                    existingUser = await _userRepository.CreateUser(newUser, _cts.Token);

                    // Log di successo
                    Console.WriteLine($"Nuovo utente registrato con successo tramite Google: {newUser.Email}");

                    // Salva il token di sessione in modo sicuro
                    await SecureStorage.Default.SetAsync("user_token", accessToken);

                    // Salva le informazioni utente non sensibili
                    Preferences.Default.Set("user_id", existingUser.Id.ToString());
                    Preferences.Default.Set("user_email", existingUser.Email);
                    Preferences.Default.Set("user_name", $"{existingUser.FirstName} {existingUser.LastName}");
                }
                catch (Exception ex)
                {
                    await DialogHelper.ShowAlertAsync("Errore registrazione",
                        $"Non è stato possibile completare la registrazione: {ex.Message}");
                    return;
                }
            }
            else
            {
                // Aggiorniamo i dati dell'utente esistente con quelli da Google 
                // solo se li abbiamo ricevuti (manteniamo i valori esistenti altrimenti)
                existingUser.ProfilePicture = googleUserInfo.Picture;

                if (!string.IsNullOrEmpty(googleUserInfo.Phone))
                    existingUser.Phone = googleUserInfo.Phone;

                if (!string.IsNullOrEmpty(googleUserInfo.Address))
                    existingUser.Address = googleUserInfo.Address;

                if (!string.IsNullOrEmpty(googleUserInfo.PhoneCountryCode))
                    existingUser.PhoneCountryCode = googleUserInfo.PhoneCountryCode;

                if (!string.IsNullOrEmpty(googleUserInfo.City))
                    existingUser.City = googleUserInfo.City;

                // Normalmente non dovremmo mai avere campi required vuoti in un utente esistente
                // Ma controlliamo comunque per sicurezza
                needsProfileCompletion = string.IsNullOrEmpty(existingUser.City) ||
                                         string.IsNullOrEmpty(existingUser.PhoneCountryCode);

                // Salva il token di sessione in modo sicuro
                await SecureStorage.Default.SetAsync("user_token", accessToken);

                // Salva le informazioni utente non sensibili
                Preferences.Default.Set("user_id", existingUser.Id.ToString());
                Preferences.Default.Set("user_email", existingUser.Email);
                Preferences.Default.Set("user_name", $"{existingUser.FirstName} {existingUser.LastName}");
            }

            // Esegui il login con le credenziali Google
            var loggedInUser =
                await _userRepository.LoginWithGoogle(existingUser.Email, accessToken, existingUser, _cts.Token);

            // Se è un nuovo utente, mostra un messaggio di benvenuto
            if (isNewUser)
                await DialogHelper.ShowAlertAsync("Benvenuto", "Il tuo account è stato creato con successo!");

            // Se mancano dati obbligatori, naviga alla pagina di completamento profilo
            if (needsProfileCompletion)
                await NavigateToProfileCompletionPage(loggedInUser);
            else
                // Altrimenti, naviga direttamente alla pagina principale
                await NavigateToMainPage();
        }
        catch (OperationCanceledException ex)
        {
            // Distingui tra cancellazione da WebAuthenticator e timeout del CancellationToken
            if (ex is TaskCanceledException)
                // Causata dall'utente che ha annullato l'autenticazione WebAuthenticator
                await DialogHelper.ShowAlertAsync("Info", "Autenticazione annullata dall'utente");
            else
                // Causata dal timeout o dalla cancellazione del token
                await DialogHelper.ShowAlertAsync("Attenzione",
                    "L'operazione è stata annullata o è scaduto il tempo massimo");
        }
        catch (Exception ex)
        {
            await DialogHelper.ShowAlertAsync("Errore", ex.Message);
        }
        finally
        {
            IsBusy = false;
            _cts?.Dispose();
            _cts = null;
        }
    }

    private static async Task<GoogleUserInfo?> GetGoogleUserInfo(string accessToken)
    {
        try
        {
            using var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var userInfoResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");

            if (!userInfoResponse.IsSuccessStatusCode)
                return null;

            var json = await userInfoResponse.Content.ReadAsStringAsync();
            var basicUserInfo = JsonSerializer.Deserialize<GoogleUserInfo>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (basicUserInfo == null)
                return new GoogleUserInfo();

            // Ottieni informazioni aggiuntive dall'API People
            var enhancedInfo = await GetGoogleUserDetailsFromPeopleApi(accessToken, basicUserInfo);

            // Ora che abbiamo sia le informazioni di base che quelle estese dalla People API
            // possiamo restituire l'oggetto completo
            return enhancedInfo;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore nel recupero delle informazioni utente: {ex.Message}");
            // Log dell'errore
            return new GoogleUserInfo(); // Restituisci un oggetto vuoto invece di null
        }
    }

    private static async Task<GoogleUserInfo?> GetGoogleUserDetailsFromPeopleApi(string accessToken,
        GoogleUserInfo? basicInfo)
    {
        basicInfo ??= new GoogleUserInfo();

        try
        {
            // Utilizziamo le API di Google.Apis.PeopleService
            var credential = GoogleCredential.FromAccessToken(accessToken);

            // Crea il servizio People API con il namespace completo
            var peopleService = new PeopleServiceService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "ShuttleBookingApp"
            });

            // Definisci quali campi vuoi recuperare
            var request = peopleService.People.Get("people/me");
            request.PersonFields = "phoneNumbers,addresses,names,emailAddresses";

            // Esegui la richiesta
            var person = await request.ExecuteAsync();

            // Salva il ResourceName
            basicInfo.ResourceName = person.ResourceName ?? string.Empty;

            // Estrai il numero di telefono se disponibile
            if (person.PhoneNumbers is { Count: > 0 })
            {
                // Aggiungi tutti i numeri di telefono alla collezione
                basicInfo.PhoneNumbers = [];

                foreach (var phone in person.PhoneNumbers)
                    basicInfo.PhoneNumbers.Add(new PhoneNumber
                    {
                        Value = phone.Value ?? string.Empty,
                        Type = phone.Type ?? string.Empty,
                        CanonicalForm = phone.CanonicalForm ?? phone.Value ?? string.Empty
                    });
            }

            // Estrai l'indirizzo se disponibile
            if (person.Addresses is { Count: > 0 })
            {
                // Aggiungi tutti gli indirizzi alla collezione
                basicInfo.Addresses = [];

                foreach (var addr in person.Addresses)
                    basicInfo.Addresses.Add(new Address
                    {
                        FormattedValue = string.Join(", ",
                            new[]
                                {
                                    addr.StreetAddress, addr.City,
                                    addr.PostalCode, addr.Country
                                }
                                .Where(x => !string.IsNullOrEmpty(x))),
                        Type = addr.Type ?? string.Empty,
                        StreetAddress = addr.StreetAddress ?? string.Empty,
                        City = addr.City ?? string.Empty,
                        PostalCode = addr.PostalCode ?? string.Empty,
                        Region = addr.Region ?? string.Empty,
                        Country = addr.Country ?? string.Empty
                    });
            }

            // Estrai i nomi se disponibili
            if (person.Names is { Count: > 0 })
            {
                basicInfo.Names = [];

                foreach (var name in person.Names)
                    basicInfo.Names.Add(new Name
                    {
                        DisplayName = name.DisplayName ?? string.Empty,
                        GivenName = name.GivenName ?? string.Empty,
                        FamilyName = name.FamilyName ?? string.Empty
                    });
            }

            // Estrai gli indirizzi email se disponibili
            if (person.EmailAddresses is not { Count: > 0 }) return basicInfo;
            basicInfo.EmailAddresses = [];

            foreach (var email in person.EmailAddresses)
                basicInfo.EmailAddresses.Add(new EmailAddress
                {
                    Value = email.Value ?? string.Empty,
                    Type = email.Type ?? string.Empty
                });

            return basicInfo;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore nel recupero dei dati da Google People API: {ex.Message}");
            return basicInfo; // Restituisci le informazioni di base se non riesci a ottenere quelle aggiuntive
        }
    }

    private static async Task NavigateToProfileCompletionPage(User? user)
    {
        // Se stai utilizzando le shell routes in MAUI dovresti usare:
        // await Shell.Current.GoToAsync($"//ProfileCompletionPage?userId={user.Id}");

        // Altrimenti, imposta direttamente la pagina
        MainThread.BeginInvokeOnMainThread(() =>
        {
            if (Application.Current == null) return;

            // Utilizza la pagina di completamento profilo creata
            var profileCompletionPage = new ProfileCompletionPage(user);
            Application.Current.MainPage = new NavigationPage(profileCompletionPage);
        });

        // Mostra un messaggio che spiega perché l'utente deve fornire questi dati
        await DialogHelper.ShowAlertAsync("Informazioni aggiuntive richieste",
            "Abbiamo bisogno di alcune informazioni aggiuntive per completare il tuo profilo.");
    }

    private void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex EmailRegex();

    private async Task NavigateToMainPage()
    {
        // Controlla se abbiamo un token salvato
        var token = await SecureStorage.Default.GetAsync("user_token");
        if (string.IsNullOrEmpty(token))
        {
            // Se non abbiamo un token, qualcosa è andato storto
            await DialogHelper.ShowAlertAsync("Errore", "Sessione non valida. Effettua nuovamente il login.");
            return;
        }

        // Naviga alla pagina principale dell'app (il TabBar principale con la prima tab selezionata)
        await Shell.Current.GoToAsync("//main/MapPage");
    }

    // Genera un code verifier casuale per PKCE (Proof Key for Code Exchange)
    private static string GenerateCodeVerifier()
    {
        const string allowedChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
        var random = new Random();
        var chars = new char[128]; // Lunghezza massima consentita

        for (var i = 0; i < chars.Length; i++) chars[i] = allowedChars[random.Next(0, allowedChars.Length)];

        return new string(chars);
    }

    // Genera code challenge da code verifier (codifica Base64Url dell'hash SHA256)
    private static string GenerateCodeChallenge(string codeVerifier)
    {
        using var sha256 = SHA256.Create();
        var challengeBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(codeVerifier));

        // Converti il risultato in Base64Url (Base64 con sostituzioni per URL-safety)
        var base64 = Convert.ToBase64String(challengeBytes);
        return base64
            .Replace('+', '-')
            .Replace('/', '_')
            .Replace("=", string.Empty);
    }

    // Scambia il codice di autorizzazione con un token di accesso
    private async Task<string> ExchangeCodeForTokenAsync(string clientId, string authCode, string redirectUri,
        string codeVerifier)
    {
        try
        {
            using var httpClient = new HttpClient();

            // Prepara i parametri per la richiesta di token
            var tokenRequestContent = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("code", authCode),
                new KeyValuePair<string, string>("redirect_uri", redirectUri),
                new KeyValuePair<string, string>("code_verifier", codeVerifier),
                new KeyValuePair<string, string>("grant_type", "authorization_code")
            });

            // Invia la richiesta al server di token
            var response = await httpClient.PostAsync(
                "https://oauth2.googleapis.com/token",
                tokenRequestContent,
                _cts?.Token ?? CancellationToken.None);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Errore nella richiesta token: {errorContent}");
                return string.Empty;
            }

            // Analizza la risposta JSON
            var tokenResponse = await response.Content.ReadAsStringAsync();
            using var jsonDoc = JsonDocument.Parse(tokenResponse);

            // Estrae il token di accesso dalla risposta
            if (jsonDoc.RootElement.TryGetProperty("access_token", out var tokenElement))
                return tokenElement.GetString() ?? string.Empty;

            return string.Empty;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore nello scambio del codice per token: {ex.Message}");
            return string.Empty;
        }
    }
}