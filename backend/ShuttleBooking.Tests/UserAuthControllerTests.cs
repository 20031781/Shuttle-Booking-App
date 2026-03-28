using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Tests;

public class UserAuthControllerTests(CustomWebApplicationFactory factory) : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task LoginRefreshLogout_EndToEnd_WorksAsExpected()
    {
        var email = $"utente.auth.{Guid.NewGuid():N}@test.it";

        var loginResponse = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            Email = email,
            GoogleToken = "valid-token"
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();

        using var profileRequest = new HttpRequestMessage(HttpMethod.Get, "/User/Me");
        profileRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload!.Token);
        var meResponse = await _client.SendAsync(profileRequest);
        meResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        using var deviceTokenRequest = new HttpRequestMessage(HttpMethod.Post, "/User/DeviceToken");
        deviceTokenRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload.Token);
        deviceTokenRequest.Content = JsonContent.Create(new DeviceTokenRequest
        {
            Token = "fcm-device-token",
            Platform = "android"
        });
        var deviceTokenResponse = await _client.SendAsync(deviceTokenRequest);
        deviceTokenResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        using var testPushRequest = new HttpRequestMessage(HttpMethod.Post, "/User/SendTestPush");
        testPushRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", loginPayload.Token);
        testPushRequest.Content = JsonContent.Create(new SendTestPushRequest
        {
            Title = "Ping",
            Body = "Test"
        });
        var testPushResponse = await _client.SendAsync(testPushRequest);
        testPushResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var refreshResponse = await _client.PostAsJsonAsync("/User/RefreshToken", new RefreshTokenRequest
        {
            RefreshToken = loginPayload.RefreshToken
        });

        refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var refreshPayload = await refreshResponse.Content.ReadFromJsonAsync<LoginResponse>();
        refreshPayload.Should().NotBeNull();
        refreshPayload!.Token.Should().NotBeNullOrWhiteSpace();
        refreshPayload.RefreshToken.Should().NotBeNullOrWhiteSpace();

        using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/User/Logout");
        logoutRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", refreshPayload.Token);
        var logoutResponse = await _client.SendAsync(logoutRequest);
        logoutResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var refreshAfterLogout = await _client.PostAsJsonAsync("/User/RefreshToken", new RefreshTokenRequest
        {
            RefreshToken = refreshPayload.RefreshToken
        });
        refreshAfterLogout.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RegisterAndLoginWithPassword_EndToEnd_WorksAsExpected()
    {
        var email = $"utente.password.{Guid.NewGuid():N}@test.it";
        const string password = "Password123!";

        var registerResponse = await _client.PostAsJsonAsync("/User/register", new RegisterUserRequest
        {
            Email = email,
            FirstName = "Utente",
            LastName = "Password",
            AuthProvider = "App",
            Password = password,
            PhoneCountryCode = "+39",
            City = "Roma"
        });
        registerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginResponse = await _client.PostAsJsonAsync("/User/Login", new PasswordLoginRequest
        {
            Email = email,
            Password = password
        });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginPayload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        loginPayload.Should().NotBeNull();
        loginPayload!.Token.Should().NotBeNullOrWhiteSpace();
        loginPayload.RefreshToken.Should().NotBeNullOrWhiteSpace();
        loginPayload.User.Email.Should().Be(email);
        loginPayload.User.AuthProvider.Should().Be("App");
    }
}