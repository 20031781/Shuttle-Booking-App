using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.Auth;
using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Tests;

public class AdminOpsControllerTests(CustomWebApplicationFactory factory) : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private async Task<string> LoginAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            IdToken = TestGoogleAuthService.CreateIdToken(email)
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var payload = await response.Content.ReadFromJsonAsync<LoginResponse>();
        payload.Should().NotBeNull();
        return payload.Token;
    }

    private static HttpRequestMessage AuthenticatedRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    [Fact]
    public async Task Overview_ReturnsUnauthorized_WhenNoToken()
    {
        var response = await _client.GetAsync("/AdminOps/Overview");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task OverviewAndHealth_ReturnOk_WhenAuthenticated()
    {
        const string email = "admin@test.it";
        var loginResponse = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            IdToken = TestGoogleAuthService.CreateIdToken(email)
        });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();

        using var overviewRequest = new HttpRequestMessage(HttpMethod.Get, "/AdminOps/Overview");
        overviewRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload.Token);
        var overviewResponse = await _client.SendAsync(overviewRequest);
        overviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var overviewPayload = await overviewResponse.Content.ReadFromJsonAsync<AdminOverviewDto>();
        overviewPayload.Should().NotBeNull();
        overviewPayload.GeneratedAtUtc.Should().NotBe(default);

        using var healthRequest = new HttpRequestMessage(HttpMethod.Get, "/AdminOps/Health");
        healthRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload.Token);
        var healthResponse = await _client.SendAsync(healthRequest);
        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var healthPayload = await healthResponse.Content.ReadFromJsonAsync<AdminHealthDto>();
        healthPayload.Should().NotBeNull();
        healthPayload.Components.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Overview_ReturnsForbidden_WhenUserIsNotAdmin()
    {
        var email = $"ops.user.{Guid.NewGuid():N}@test.it";
        var loginResponse = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            IdToken = TestGoogleAuthService.CreateIdToken(email)
        });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();

        using var overviewRequest = new HttpRequestMessage(HttpMethod.Get, "/AdminOps/Overview");
        overviewRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload.Token);
        var overviewResponse = await _client.SendAsync(overviewRequest);
        overviewResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AssignRole_GrantsRole_AndReflectsInFreshTokenAfterNextLogin()
    {
        var adminToken = await LoginAsync("admin@test.it");
        var targetEmail = $"promoted.{Guid.NewGuid():N}@test.it";
        await LoginAsync(targetEmail); // crea l'utente senza alcun ruolo

        using var assignRequest = AuthenticatedRequest(HttpMethod.Post, "/AdminOps/Roles/Assign", adminToken);
        assignRequest.Content = JsonContent.Create(new AssignRoleRequest { Email = targetEmail, Role = Roles.Manager });
        var assignResponse = await _client.SendAsync(assignRequest);
        assignResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var assignPayload = await assignResponse.Content.ReadFromJsonAsync<UserRolesDto>();
        assignPayload.Should().NotBeNull();
        assignPayload.Roles.Should().Contain(Roles.Manager);

        // Un nuovo login deve emettere un JWT che riflette il ruolo appena assegnato.
        var refreshedToken = await LoginAsync(targetEmail);
        using var createShuttleRequest =
            AuthenticatedRequest(HttpMethod.Post, "/Shuttles/CreateShuttle", refreshedToken);
        createShuttleRequest.Content = JsonContent.Create(new
        {
            Name = "Ruolo assegnato via test",
            Capacity = 10,
            MeetingAtUtc = DateTime.UtcNow.AddHours(2)
        });
        var createShuttleResponse = await _client.SendAsync(createShuttleRequest);
        createShuttleResponse.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task RevokeRole_RemovesRole()
    {
        var adminToken = await LoginAsync("admin@test.it");
        var targetEmail = $"demoted.{Guid.NewGuid():N}@test.it";
        await LoginAsync(targetEmail);

        using var assignRequest = AuthenticatedRequest(HttpMethod.Post, "/AdminOps/Roles/Assign", adminToken);
        assignRequest.Content = JsonContent.Create(new AssignRoleRequest { Email = targetEmail, Role = Roles.Manager });
        (await _client.SendAsync(assignRequest)).StatusCode.Should().Be(HttpStatusCode.OK);

        using var revokeRequest = AuthenticatedRequest(HttpMethod.Post, "/AdminOps/Roles/Revoke", adminToken);
        revokeRequest.Content = JsonContent.Create(new AssignRoleRequest { Email = targetEmail, Role = Roles.Manager });
        var revokeResponse = await _client.SendAsync(revokeRequest);
        revokeResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var revokePayload = await revokeResponse.Content.ReadFromJsonAsync<UserRolesDto>();
        revokePayload.Should().NotBeNull();
        revokePayload.Roles.Should().NotContain(Roles.Manager);
    }

    [Fact]
    public async Task AssignRole_ReturnsBadRequest_ForUnknownRole()
    {
        var adminToken = await LoginAsync("admin@test.it");

        using var assignRequest = AuthenticatedRequest(HttpMethod.Post, "/AdminOps/Roles/Assign", adminToken);
        assignRequest.Content = JsonContent.Create(new AssignRoleRequest
            { Email = "admin@test.it", Role = "SuperAdmin" });
        var assignResponse = await _client.SendAsync(assignRequest);

        assignResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AssignRole_ReturnsNotFound_ForUnknownEmail()
    {
        var adminToken = await LoginAsync("admin@test.it");

        using var assignRequest = AuthenticatedRequest(HttpMethod.Post, "/AdminOps/Roles/Assign", adminToken);
        assignRequest.Content = JsonContent.Create(new AssignRoleRequest
        {
            Email = $"nobody.{Guid.NewGuid():N}@test.it",
            Role = Roles.Manager
        });
        var assignResponse = await _client.SendAsync(assignRequest);

        assignResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task AssignRole_ReturnsForbidden_WhenCallerIsNotAdmin()
    {
        var managerToken = await LoginAsync("manager@test.it");

        using var assignRequest = AuthenticatedRequest(HttpMethod.Post, "/AdminOps/Roles/Assign", managerToken);
        assignRequest.Content = JsonContent.Create(new AssignRoleRequest
            { Email = "manager@test.it", Role = Roles.Admin });
        var assignResponse = await _client.SendAsync(assignRequest);

        assignResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}