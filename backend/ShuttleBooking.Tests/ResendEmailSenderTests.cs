using System.Net;
using System.Net.Http.Headers;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using ShuttleBooking.Business.Services;

namespace ShuttleBooking.Tests;

public class ResendEmailSenderTests
{
    [Fact]
    public async Task SendAsync_SendsExpectedPayloadAndStableIdempotencyKey()
    {
        var handler = new CapturingHandler();
        var sender = new ResendEmailSender(new HttpClient(handler), BuildConfiguration(
            "re_test_key", "ShuttleBooking <no-reply@example.test>"));

        await sender.SendAsync("user@example.test", "Oggetto", "<p>Ciao</p>");
        await sender.SendAsync("user@example.test", "Oggetto", "<p>Ciao</p>");

        handler.Requests.Should().HaveCount(2);
        handler.Requests.Should().OnlyContain(request =>
            request.Method == HttpMethod.Post
            && request.Url == "https://api.resend.com/emails"
            && request.Authorization != null
            && request.Authorization.Scheme == "Bearer"
            && request.Authorization.Parameter == "re_test_key"
            && request.IdempotencyKey.StartsWith("shuttle-booking-", StringComparison.Ordinal));
        handler.Requests.Select(request => request.IdempotencyKey).Distinct().Should().ContainSingle();
        handler.Requests[0].Body.Should().Contain("user@example.test");
        handler.Requests[0].Body.Should().Contain("ShuttleBooking");
    }

    [Theory]
    [InlineData("", "sender@example.test")]
    [InlineData("re_test_key", "")]
    public async Task SendAsync_RejectsMissingRequiredConfiguration(string apiKey, string fromAddress)
    {
        var handler = new CapturingHandler();
        var sender = new ResendEmailSender(new HttpClient(handler), BuildConfiguration(apiKey, fromAddress));

        var action = () => sender.SendAsync("user@example.test", "Oggetto", "<p>Ciao</p>");

        await action.Should().ThrowAsync<InvalidOperationException>();
        handler.Requests.Should().BeEmpty();
    }

    private static IConfiguration BuildConfiguration(string apiKey, string fromAddress) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Resend:ApiKey"] = apiKey,
            ["Resend:FromAddress"] = fromAddress
        }).Build();

    private sealed class CapturingHandler : HttpMessageHandler
    {
        public List<CapturedRequest> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(new CapturedRequest(
                request.Method,
                request.RequestUri?.ToString() ?? string.Empty,
                request.Headers.Authorization,
                request.Headers.GetValues("Idempotency-Key").Single(),
                request.Content == null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken)));

            return new HttpResponseMessage(HttpStatusCode.Created);
        }
    }

    private sealed record CapturedRequest(
        HttpMethod Method,
        string Url,
        AuthenticationHeaderValue? Authorization,
        string IdempotencyKey,
        string Body);
}