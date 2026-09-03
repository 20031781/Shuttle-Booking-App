using Microsoft.Extensions.Configuration;

namespace ShuttleBooking.Business.Services;

/// <summary>
///     Legge gli OAuth client ID autorizzati ad emettere ID token per l'app.
///     I valori supportano sia un array di configurazione sia liste separate da
///     virgole, cosi' gli environment Docker restano semplici da impostare.
/// </summary>
public static class GoogleAudienceConfiguration
{
    public static IReadOnlyCollection<string> GetAudiences(IConfiguration configuration)
    {
        var configuredValues = new List<string?>
        {
            configuration["GoogleAuth:ClientId"],
            configuration["GoogleAuth:ClientIds"],
            configuration["GoogleAuth:WebClientId"],
            configuration["GoogleAuth:AndroidClientId"],
            configuration["GoogleAuth:IosClientId"]
        };

        configuredValues.AddRange(configuration.GetSection("GoogleAuth:ClientIds")
            .GetChildren()
            .Select(item => item.Value));

        return configuredValues
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .SelectMany(value => value!.Split([',', ';', ' ', '\r', '\n', '\t'],
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }
}