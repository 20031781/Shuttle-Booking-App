using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Business.Services;

public class FirebasePushNotificationService(
    HttpClient httpClient,
    IUserRepository userRepository,
    IOptions<PushNotificationsOptions> optionsAccessor,
    ILogger<FirebasePushNotificationService> logger) : IPushNotificationService
{
    private const string FirebaseScope = "https://www.googleapis.com/auth/firebase.messaging";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly SemaphoreSlim _credentialLock = new(1, 1);
    private readonly PushNotificationsOptions _options = optionsAccessor.Value;
    private GoogleCredential? _credential;

    public async Task<PushSendResult> SendToUserAsync(
        int userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
            return new PushSendResult
            {
                Status = PushSendStatus.NotConfigured,
                Details = "PushNotifications:Enabled=false"
            };

        if (string.IsNullOrWhiteSpace(_options.FirebaseProjectId))
            return new PushSendResult
            {
                Status = PushSendStatus.NotConfigured,
                Details = "PushNotifications:FirebaseProjectId mancante"
            };

        var user = await userRepository.GetByIdAsync(userId);
        if (user == null)
            return new PushSendResult
            {
                Status = PushSendStatus.UserNotFound,
                Details = $"Utente {userId} non trovato"
            };

        if (string.IsNullOrWhiteSpace(user.DeviceToken))
            return new PushSendResult
            {
                Status = PushSendStatus.MissingDeviceToken,
                Details = "Device token non registrato"
            };

        var credential = await GetCredentialAsync(cancellationToken);
        if (credential == null)
            return new PushSendResult
            {
                Status = PushSendStatus.NotConfigured,
                Details = "Credenziali service account non valide o mancanti"
            };

        try
        {
            var accessToken = await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(
                cancellationToken: cancellationToken);

            var payload = new
            {
                message = new
                {
                    token = user.DeviceToken.Trim(),
                    notification = new
                    {
                        title,
                        body
                    },
                    data = data != null && data.Count > 0
                        ? new Dictionary<string, string>(data)
                        : null
                }
            };

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"https://fcm.googleapis.com/v1/projects/{_options.FirebaseProjectId}/messages:send");

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            request.Content =
                new StringContent(JsonSerializer.Serialize(payload, SerializerOptions), Encoding.UTF8,
                    "application/json");

            var response = await httpClient.SendAsync(request, cancellationToken);
            var content = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
                return new PushSendResult
                {
                    Status = PushSendStatus.Sent
                };

            if (response.StatusCode is HttpStatusCode.BadRequest or HttpStatusCode.NotFound &&
                (content.Contains("UNREGISTERED", StringComparison.OrdinalIgnoreCase) ||
                 content.Contains("registration-token-not-registered", StringComparison.OrdinalIgnoreCase)))
                await ClearDeviceTokenAsync(user);

            logger.LogWarning(
                "Invio push non riuscito. UserId={UserId} StatusCode={StatusCode} Body={Body}",
                userId,
                (int)response.StatusCode,
                content);

            return new PushSendResult
            {
                Status = PushSendStatus.ProviderRejected,
                Details = $"{(int)response.StatusCode}: {content}"
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore trasporto durante invio push a UserId={UserId}", userId);
            return new PushSendResult
            {
                Status = PushSendStatus.TransportError,
                Details = ex.Message
            };
        }
    }

    private async Task<GoogleCredential?> GetCredentialAsync(CancellationToken cancellationToken)
    {
        if (_credential != null) return _credential;

        await _credentialLock.WaitAsync(cancellationToken);
        try
        {
            if (_credential != null) return _credential;

            GoogleCredential? credential = null;
            if (!string.IsNullOrWhiteSpace(_options.ServiceAccountJson))
                credential = GoogleCredential.FromJson(_options.ServiceAccountJson);
            else if (!string.IsNullOrWhiteSpace(_options.ServiceAccountPath) &&
                     File.Exists(_options.ServiceAccountPath))
                credential = GoogleCredential.FromFile(_options.ServiceAccountPath);

            _credential = credential?.CreateScoped(FirebaseScope);
            return _credential;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Caricamento credenziali Firebase fallito");
            return null;
        }
        finally
        {
            _credentialLock.Release();
        }
    }

    private async Task ClearDeviceTokenAsync(User user)
    {
        user.DeviceToken = null;
        user.DevicePlatform = null;
        user.DeviceTokenUpdatedAt = DateTime.UtcNow;
        await userRepository.UpdateAsync(user);
    }
}