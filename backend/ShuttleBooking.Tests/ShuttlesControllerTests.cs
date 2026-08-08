using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Business.Models.User;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data;

namespace ShuttleBooking.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"ShuttleBookingTests_{Guid.NewGuid()}";

    public TestPushNotificationService PushNotificationService { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder
            .ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["RateLimiting:MaxRequestsPerMinute"] = "1000000",
                    ["AdminDashboard:AllowedEmails:0"] = "admin@test.it",
                    ["ManagerDashboard:AllowedEmails:0"] = "manager@test.it"
                });
            })
            .ConfigureServices(services =>
            {
                services.RemoveAll<DbContextOptions<AppDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
                services.RemoveAll<AppDbContext>();
                services.RemoveAll<IGoogleAuthService>();
                services.RemoveAll<IPushNotificationService>();

                services.AddDbContext<AppDbContext>(options => { options.UseInMemoryDatabase(_databaseName); });
                services.AddSingleton<IGoogleAuthService, TestGoogleAuthService>();
                services.AddSingleton<IPushNotificationService>(PushNotificationService);
            });
}

public sealed class TestGoogleAuthService : IGoogleAuthService
{
    public Task<bool> ValidateTokenAsync(string token, string email) => Task.FromResult(true);
}

public sealed class TestPushNotificationService : IPushNotificationService
{
    public ConcurrentBag<(int UserId, string Title, string Body, IReadOnlyDictionary<string, string>? Data)> Calls
    {
        get;
    } = new();

    public Task<PushSendResult> SendToUserAsync(
        int userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data = null,
        CancellationToken cancellationToken = default)
    {
        Calls.Add((userId, title, body, data));
        return Task.FromResult(new PushSendResult
        {
            Status = PushSendStatus.NotConfigured,
            Details = "Test double: push non configurato."
        });
    }
}

public class ProgramTest : IClassFixture<CustomWebApplicationFactory>
{
    private const string RequestBase = "/Shuttles/";
    private readonly HttpClient _client;
    private readonly CustomWebApplicationFactory _factory;

    public ProgramTest(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        // Create a client to send HTTP requests to the test server
        _client = _factory.CreateClient();
    }

    private async Task<string> LoginAsync(string email)
    {
        var loginResponse = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            Email = email,
            GoogleToken = "valid-token"
        });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();
        return loginPayload!.Token;
    }

    private async Task AuthenticateAsManagerAsync()
    {
        var token = await LoginAsync("manager@test.it");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task GetAllShuttles_ReturnsSuccessAndCorrectContentType()
    {
        // Arrange
        const string request = RequestBase + "GetShuttles";

        // Act
        var response = await _client.GetAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task GetShuttleById_ReturnsNotFound_ForInvalidId()
    {
        // Arrange
        const string request = RequestBase + "GetShuttle/99999";

        // Act
        var response = await _client.GetAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetShuttleById_ReturnsOk_ForValidId()
    {
        // Arrange
        await AuthenticateAsManagerAsync();
        var createShuttleDto = new CreateShuttleDto
        {
            Name = "Test Shuttle",
            Capacity = 10
        };

        // Creazione dello shuttle per avere un ID valido
        const string createRequest = RequestBase + "CreateShuttle";
        var createResponse = await _client.PostAsJsonAsync(createRequest, createShuttleDto);
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created); // Assicurati che la creazione abbia successo

        var createdShuttle = await createResponse.Content.ReadFromJsonAsync<ShuttleDto>();
        var shuttleId = createdShuttle!.Id; // Ottieni l'ID dello shuttle creato

        // Act
        var request = RequestBase + $"GetShuttle/{shuttleId}";
        var response = await _client.GetAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var shuttleResult = await response.Content.ReadFromJsonAsync<ShuttleDto>();
        shuttleResult.Should().NotBeNull();
        shuttleResult!.Id.Should().Be(shuttleId); // Assicurati che l'ID corrisponda
        shuttleResult.Name.Should().Be(createShuttleDto.Name); // Verifica il nome

        // Cancello lo shuttle appena creato
        var deleteRequest = RequestBase + $"DeleteShuttle/{shuttleId}";
        await _client.DeleteAsync(deleteRequest);
    }

    [Fact]
    public async Task CreateShuttle_ReturnsCreatedStatus_WithValidData()
    {
        // Arrange
        await AuthenticateAsManagerAsync();
        var createShuttleDto = new CreateShuttleDto
        {
            Name = "Test Shuttle",
            Capacity = 50
        };
        const string request = RequestBase + "CreateShuttle";

        // Act
        var response = await _client.PostAsJsonAsync(request, createShuttleDto);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        response.Headers.Location.Should().NotBeNull();

        // Ottieni l'ID dallo shuttle creato dall'URL nella Location
        var createdShuttleUrl = response.Headers.Location!.ToString();
        var shuttleId = int.Parse(createdShuttleUrl.Split('/').Last()); // Estrai l'ID dall'URL

        var createdShuttle = await response.Content.ReadFromJsonAsync<ShuttleDto>();
        createdShuttle.Should().NotBeNull();
        createdShuttle!.Name.Should().Be(createShuttleDto.Name);
        createdShuttle.Capacity.Should().Be(createShuttleDto.Capacity);

        // Cancello lo shuttle appena creato
        var deleteRequest = RequestBase + $"DeleteShuttle/{shuttleId}";
        await _client.DeleteAsync(deleteRequest);
    }

    [Fact]
    public async Task CreateShuttle_ReturnsBadRequest_ForNullData()
    {
        // Arrange
        await AuthenticateAsManagerAsync();
        const string request = RequestBase + "CreateShuttle";

        // Act
        var response = await _client.PostAsync(request, null); // Invio null direttamente

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorResponse = await response.Content.ReadFromJsonAsync<Dictionary<string, JsonElement>>();
        errorResponse.Should().NotBeNull();
        errorResponse!["message"].GetString().Should().Be("Dati dello shuttle nulli.");
    }

    [Fact]
    public async Task UpdateShuttleDetails_ReturnsOk_ForValidPayload()
    {
        await AuthenticateAsManagerAsync();
        var createResponse = await _client.PostAsJsonAsync(RequestBase + "CreateShuttle", new CreateShuttleDto
        {
            Name = "Shuttle Originale",
            Capacity = 10
        });
        createResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createdShuttle = await createResponse.Content.ReadFromJsonAsync<ShuttleDto>();
        createdShuttle.Should().NotBeNull();

        var updateResponse =
            await _client.PutAsJsonAsync(
                RequestBase + $"UpdateShuttleDetails/{createdShuttle!.Id}",
                new UpdateShuttleDetailsRequest
                {
                    Name = "Shuttle Aggiornata",
                    Capacity = 22,
                    MeetingAtUtc = new DateTime(2026, 04, 02, 07, 45, 0, DateTimeKind.Utc)
                });

        updateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ShuttleDto>();
        updated.Should().NotBeNull();
        updated!.Name.Should().Be("Shuttle Aggiornata");
        updated.Capacity.Should().Be(22);
        updated.MeetingAtUtc.Should().Be(new DateTime(2026, 04, 02, 07, 45, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task DeleteShuttle_ReturnsOk_ForExistingShuttle()
    {
        // Arrange
        await AuthenticateAsManagerAsync();
        // Creo un nuovo shuttle utilizzando l'endpoint CreateShuttle
        var createShuttleDto = new CreateShuttleDto
        {
            Name = "Test Shuttle",
            Capacity = 10
        };

        const string createRequest = RequestBase + "CreateShuttle";
        var createResponse = await _client.PostAsJsonAsync(createRequest, createShuttleDto);
        createResponse.StatusCode.Should()
            .Be(HttpStatusCode.Created); // Verifica che la creazione sia avvenuta con successo

        var createdShuttle = await createResponse.Content.ReadFromJsonAsync<ShuttleDto>();
        var shuttleId = createdShuttle!.Id; // Ottengo l'ID dello shuttle appena creato

        // Ora possiamo usare l'ID creato per eliminarlo
        var deleteRequest = RequestBase + $"DeleteShuttle/{shuttleId}";

        // Act
        var response = await _client.DeleteAsync(deleteRequest);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<bool>();
        result.Should().BeTrue();

        // Verifico che lo shuttle non esista più
        var deletedShuttleResponse = await _client.GetAsync(RequestBase + $"GetShuttle/{shuttleId}");
        deletedShuttleResponse.StatusCode.Should()
            .Be(HttpStatusCode.NotFound); // Verifica che il shuttle non esista più
    }

    [Fact]
    public async Task DeleteShuttle_ReturnsNotFound_ForInvalidId()
    {
        // Arrange
        await AuthenticateAsManagerAsync();
        const string request = RequestBase + "DeleteShuttle/99999"; // Un ID che non esiste

        // Act
        var response = await _client.DeleteAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var errorResponse = await response.Content.ReadFromJsonAsync<Dictionary<string, JsonElement>>();
        errorResponse.Should().ContainKey("message");
        errorResponse?["message"].GetString().Should().Be("Shuttle con ID 99999 non trovato.");
    }

    [Fact]
    public async Task CreateShuttle_ReturnsUnauthorized_WhenNoToken()
    {
        var response = await _client.PostAsJsonAsync(RequestBase + "CreateShuttle", new CreateShuttleDto
        {
            Name = "Test Shuttle",
            Capacity = 10
        });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateShuttle_ReturnsForbidden_WhenUserIsNotManagerOrAdmin()
    {
        var token = await LoginAsync($"rider.{Guid.NewGuid():N}@test.it");
        using var request = new HttpRequestMessage(HttpMethod.Post, RequestBase + "CreateShuttle")
        {
            Content = JsonContent.Create(new CreateShuttleDto { Name = "Test Shuttle", Capacity = 10 })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteShuttle_ReturnsUnauthorized_WhenNoToken()
    {
        var response = await _client.DeleteAsync(RequestBase + "DeleteShuttle/1");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateShuttleDetails_ReturnsForbidden_WhenUserIsNotManagerOrAdmin()
    {
        var token = await LoginAsync($"rider.{Guid.NewGuid():N}@test.it");
        using var request = new HttpRequestMessage(HttpMethod.Put, RequestBase + "UpdateShuttleDetails/1")
        {
            Content = JsonContent.Create(new UpdateShuttleDetailsRequest
            {
                Name = "Test Shuttle",
                Capacity = 10,
                MeetingAtUtc = DateTime.UtcNow
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SwaggerEndpoint_IsAccessible_InDevelopment()
    {
        // Arrange
        // Ensure the environment is set to Development for this test
        var factory = _factory.WithWebHostBuilder(builder => { builder.UseEnvironment("Development"); });
        var client = factory.CreateClient();
        const string request = "/swagger/v1/swagger.json";

        // Act
        var response = await client.GetAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
    }

    [Fact]
    public async Task SwaggerEndpoint_IsNotAccessible_InProduction()
    {
        // Arrange
        // Ensure the environment is set to Production for this test
        var factory = _factory.WithWebHostBuilder(builder => { builder.UseEnvironment("Production"); });
        var client = factory.CreateClient();
        const string request = "/swagger/v1/swagger.json";

        // Act
        var response = await client.GetAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}