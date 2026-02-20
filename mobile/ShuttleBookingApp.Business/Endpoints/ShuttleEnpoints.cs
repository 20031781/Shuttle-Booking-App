using Microsoft.Maui.Devices;

namespace ShuttleBookingApp.Business.Endpoints;

/// <summary>
///     Classe statica che contiene gli endpoint per le operazioni sugli "Shuttle".
/// </summary>
public static class ShuttleEndpoints
{
    /// <summary>
    ///     URL base per tutti gli endpoint degli "Shuttles". <br />
    ///     In base all'ambiente di esecuzione dell'applicazione viene scelto l'indirizzo IP corretto.
    /// </summary>
    private static string BaseUrl
    {
        get
        {
            // Supponiamo che questo metodo ottenga l'IP del dispositivo
            var address = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                .SelectMany(n => n.GetIPProperties().UnicastAddresses)
                .FirstOrDefault(u => u.Address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                ?.Address.ToString();
    
            if (DeviceInfo.DeviceType == DeviceType.Virtual)
            {
                return "http://10.0.2.2:5000/Shuttles/";
            }
    
            // Controllo IP locale
            if (address != null && (address.StartsWith("192.168.") || address.StartsWith("10.") ||
                                    address.StartsWith("172.")))
            {
                return "http://192.168.1.60:5000/Shuttles/";
            }
            return "http://93.41.237.121:5000/Shuttles/";
        }
    }

    /// <summary>
    ///     Endpoint per ottenere tutti gli "Shuttles".
    /// </summary>
    public static string GetAllShuttles => BaseUrl + "GetShuttles";

    /// <summary>
    ///     Endpoint per ottenere uno "Shuttle" tramite il suo ID.
    /// </summary>
    public static string GetShuttleById => BaseUrl + "GetShuttle/{id:int}";

    /// <summary>
    ///     Endpoint per creare un nuovo "Shuttle".
    /// </summary>
    public static string CreateShuttle => BaseUrl + "CreateShuttle";

    /// <summary>
    ///     Endpoint per aggiornare uno "Shuttle" esistente tramite il suo ID.
    /// </summary>
    public static string UpdateShuttle => BaseUrl + "UpdateShuttle/{id:int}";

    /// <summary>
    ///     Endpoint per eliminare uno "Shuttle" tramite il suo ID.
    /// </summary>
    public static string DeleteShuttle => BaseUrl + "DeleteShuttle/{id:int}";
}