using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using ShuttleBooking.Business.DTOs;

namespace ShuttleBooking.Tests;

public class ProgramTest : IClassFixture<WebApplicationFactory<Program>>
{
    private const string RequestBase = "/Shuttles/";
    private readonly HttpClient _client;
    private readonly WebApplicationFactory<Program> _factory;

    public ProgramTest(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        // Create a client to send HTTP requests to the test server
        _client = _factory.CreateClient();
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
        var createShuttleDto = new CreateShuttleDto(10)
        {
            Name = "Test Shuttle"
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
        var createShuttleDto = new CreateShuttleDto(50)
        {
            Name = "Test Shuttle"
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
        const string request = RequestBase + "CreateShuttle";

        // Act
        var response = await _client.PostAsync(request, null); // Invio null direttamente

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errorResponse = await response.Content.ReadAsStringAsync(); // Leggi come stringa
        errorResponse.Should().Be("Dati dello shuttle nulli.");
    }

    [Fact]
    public async Task UpdateShuttle_ReturnsBadRequest_ForInvalidCapacity()
    {
        // Arrange
        const int invalidCapacity = -10;
        const string request = RequestBase + "UpdateShuttle/1";

        // Act
        var response = await _client.PutAsJsonAsync(request, invalidCapacity);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateShuttle_ReturnsOk_ForValidCapacity()
    {
        // Arrange
        // Creo un nuovo shuttle utilizzando l'endpoint CreateShuttle
        var createShuttleDto = new CreateShuttleDto(10)
        {
            Name = "Test Shuttle"
        };

        const string createRequest = RequestBase + "CreateShuttle";
        var createResponse = await _client.PostAsJsonAsync(createRequest, createShuttleDto);
        createResponse.StatusCode.Should()
            .Be(HttpStatusCode.Created); // Verifica che la creazione sia avvenuta con successo

        var createdShuttle = await createResponse.Content.ReadFromJsonAsync<ShuttleDto>();
        var shuttleId = createdShuttle!.Id; // Ottengo l'ID dello shuttle appena creato

        const int newCapacity = 50; // Capacità valida
        var updateRequest = RequestBase + $"UpdateShuttle/{shuttleId}";

        // Act
        var response = await _client.PutAsJsonAsync(updateRequest, newCapacity);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updatedShuttle = await response.Content.ReadFromJsonAsync<ShuttleDto>();
        updatedShuttle.Should().NotBeNull();
        updatedShuttle!.Capacity.Should().Be(newCapacity); // Verifica che la capacità sia stata aggiornata

        // Cancello lo shuttle appena creato
        var deleteRequest = RequestBase + $"DeleteShuttle/{shuttleId}";
        await _client.DeleteAsync(deleteRequest);
    }

    [Fact]
    public async Task UpdateShuttle_ReturnsBadRequest_ForCapacityGreaterThan100()
    {
        // Arrange
        // Creo un nuovo shuttle utilizzando l'endpoint CreateShuttle
        var createShuttleDto = new CreateShuttleDto(10)
        {
            Name = "Test Shuttle"
        };

        const string createRequest = RequestBase + "CreateShuttle";
        var createResponse = await _client.PostAsJsonAsync(createRequest, createShuttleDto);
        createResponse.StatusCode.Should()
            .Be(HttpStatusCode.Created); // Verifica che la creazione sia avvenuta con successo

        var createdShuttle = await createResponse.Content.ReadFromJsonAsync<ShuttleDto>();
        var shuttleId = createdShuttle!.Id; // Ottengo l'ID dello shuttle appena creato

        const int invalidCapacity = 150; // Capacità superiore a 100
        var updateRequest = RequestBase + $"UpdateShuttle/{shuttleId}";

        // Act
        var response = await _client.PutAsJsonAsync(updateRequest, invalidCapacity);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        // Cancello lo shuttle appena creato
        var deleteRequest = RequestBase + $"DeleteShuttle/{shuttleId}";
        await _client.DeleteAsync(deleteRequest);
    }

    [Fact]
    public async Task UpdateShuttle_ReturnsNotFound_ForInvalidId()
    {
        // Arrange
        const int invalidId = 99999; // ID che non esiste
        const int newCapacity = 50; // Capacità valida
        var updateRequest = RequestBase + $"UpdateShuttle/{invalidId}";

        // Act
        var response = await _client.PutAsJsonAsync(updateRequest, newCapacity);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteShuttle_ReturnsOk_ForExistingShuttle()
    {
        // Arrange
        // Creo un nuovo shuttle utilizzando l'endpoint CreateShuttle
        var createShuttleDto = new CreateShuttleDto(10)
        {
            Name = "Test Shuttle"
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
        var deletedShuttleResponse = await _client.GetAsync(RequestBase + shuttleId);
        deletedShuttleResponse.StatusCode.Should()
            .Be(HttpStatusCode.NotFound); // Verifica che il shuttle non esista più
    }

    [Fact]
    public async Task DeleteShuttle_ReturnsNotFound_ForInvalidId()
    {
        // Arrange
        const string request = RequestBase + "DeleteShuttle/99999"; // Un ID che non esiste

        // Act
        var response = await _client.DeleteAsync(request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var errorResponse = await response.Content.ReadFromJsonAsync<Dictionary<string, string>>();
        errorResponse.Should().ContainKey("message"); // Modificato a "message"
        errorResponse?["message"].Should().Be("Shuttle con ID 99999 non trovato."); // Modificato a "message"
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