using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Tests;

public class AdminOpsControllerTests(CustomWebApplicationFactory factory) : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

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
            Email = email,
            GoogleToken = "valid-token"
        });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();

        using var overviewRequest = new HttpRequestMessage(HttpMethod.Get, "/AdminOps/Overview");
        overviewRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload!.Token);
        var overviewResponse = await _client.SendAsync(overviewRequest);
        overviewResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var overviewPayload = await overviewResponse.Content.ReadFromJsonAsync<AdminOverviewDto>();
        overviewPayload.Should().NotBeNull();
        overviewPayload!.GeneratedAtUtc.Should().NotBe(default);

        using var healthRequest = new HttpRequestMessage(HttpMethod.Get, "/AdminOps/Health");
        healthRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload.Token);
        var healthResponse = await _client.SendAsync(healthRequest);
        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var healthPayload = await healthResponse.Content.ReadFromJsonAsync<AdminHealthDto>();
        healthPayload.Should().NotBeNull();
        healthPayload!.Components.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Overview_ReturnsForbidden_WhenUserIsNotAdmin()
    {
        var email = $"ops.user.{Guid.NewGuid():N}@test.it";
        var loginResponse = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            Email = email,
            GoogleToken = "valid-token"
        });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();

        using var overviewRequest = new HttpRequestMessage(HttpMethod.Get, "/AdminOps/Overview");
        overviewRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload!.Token);
        var overviewResponse = await _client.SendAsync(overviewRequest);
        overviewResponse.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}