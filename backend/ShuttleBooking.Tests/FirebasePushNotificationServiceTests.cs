using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Tests;

public class FirebasePushNotificationServiceTests
{
    [Fact]
    public async Task SendToUserAsync_ReturnsNotConfigured_WhenPushIsDisabled()
    {
        var repository = new Mock<IUserRepository>();
        var service = CreateService(new PushNotificationsOptions { Enabled = false }, repository.Object);

        var result = await service.SendToUserAsync(1, "Titolo", "Corpo");

        result.Status.Should().Be(PushSendStatus.NotConfigured);
        repository.Verify(repository => repository.GetByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task SendToUserAsync_ReturnsNotConfigured_WhenProjectIdIsMissing()
    {
        var repository = new Mock<IUserRepository>();
        var service = CreateService(new PushNotificationsOptions { Enabled = true }, repository.Object);

        var result = await service.SendToUserAsync(1, "Titolo", "Corpo");

        result.Status.Should().Be(PushSendStatus.NotConfigured);
        repository.Verify(repository => repository.GetByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task SendToUserAsync_ReturnsUserNotFound_WhenUserDoesNotExist()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(repository => repository.GetByIdAsync(1)).ReturnsAsync((User?)null);
        var service = CreateService(new PushNotificationsOptions
        {
            Enabled = true,
            FirebaseProjectId = "test-project"
        }, repository.Object);

        var result = await service.SendToUserAsync(1, "Titolo", "Corpo");

        result.Status.Should().Be(PushSendStatus.UserNotFound);
    }

    [Fact]
    public async Task SendToUserAsync_ReturnsMissingDeviceToken_WhenUserHasNoToken()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(repository => repository.GetByIdAsync(1)).ReturnsAsync(CreateUser());
        var service = CreateService(new PushNotificationsOptions
        {
            Enabled = true,
            FirebaseProjectId = "test-project"
        }, repository.Object);

        var result = await service.SendToUserAsync(1, "Titolo", "Corpo");

        result.Status.Should().Be(PushSendStatus.MissingDeviceToken);
    }

    [Fact]
    public async Task SendToUserAsync_ReturnsNotConfigured_WhenServiceAccountJsonIsInvalid()
    {
        var repository = new Mock<IUserRepository>();
        repository.Setup(repository => repository.GetByIdAsync(1)).ReturnsAsync(CreateUser("device-token"));
        var service = CreateService(new PushNotificationsOptions
        {
            Enabled = true,
            FirebaseProjectId = "test-project",
            ServiceAccountJson = "not-json"
        }, repository.Object);

        var result = await service.SendToUserAsync(1, "Titolo", "Corpo");

        result.Status.Should().Be(PushSendStatus.NotConfigured);
    }

    private static FirebasePushNotificationService CreateService(
        PushNotificationsOptions options,
        IUserRepository repository) =>
        new(
            new HttpClient(new ThrowingHandler()),
            repository,
            Options.Create(options),
            NullLogger<FirebasePushNotificationService>.Instance);

    private static User CreateUser(string? deviceToken = null) => new()
    {
        Email = "user@test.it",
        FirstName = "Test",
        LastName = "User",
        AuthProvider = "Google",
        PhoneCountryCode = "+39",
        City = "Roma",
        DeviceToken = deviceToken
    };

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromException<HttpResponseMessage>(new InvalidOperationException("HTTP non atteso"));
    }
}
