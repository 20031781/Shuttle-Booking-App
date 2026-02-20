using System.Diagnostics;

namespace ShuttleBookingApp.Presentation.MetodiComuni;

/// <summary>
///     Fornisce metodi comuni per mostrare finestre di dialogo all'utente.
/// </summary>
public static class DialogHelper
{
    /// <summary>
    ///     Mostra un messaggio di alert all'utente con un singolo pulsante di conferma.
    /// </summary>
    /// <param name="title">Titolo dell'alert</param>
    /// <param name="message">Messaggio dell'alert</param>
    /// <param name="button">Testo del pulsante di conferma</param>
    /// <returns>Task che rappresenta l'operazione asincrona</returns>
    public static async Task ShowAlertAsync(string title, string message, string button = "Ok")
    {
        // Utilizza MainThread per assicurarti che l'interazione UI avvenga sul thread principale
        await MainThread.InvokeOnMainThreadAsync(() =>
        {
            if (Application.Current?.MainPage != null)
                return Application.Current.MainPage.DisplayAlert(title, message, button);
            // Log se non è possibile mostrare l'alert
            Debug.WriteLine($"Impossibile mostrare alert: {title} - {message}");
            return Task.CompletedTask;
        });
    }

    /// <summary>
    ///     Mostra un messaggio di conferma con pulsanti Sì/No.
    /// </summary>
    /// <param name="title">Titolo della conferma</param>
    /// <param name="message">Messaggio della conferma</param>
    /// <param name="accept">Testo del pulsante di accettazione (default: "Sì")</param>
    /// <param name="cancel">Testo del pulsante di cancellazione (default: "No")</param>
    /// <returns>True se l'utente ha confermato, False altrimenti</returns>
    public static async Task<bool> ShowConfirmationAsync(string title, string message, string accept = "Sì",
        string cancel = "No")
    {
        return await MainThread.InvokeOnMainThreadAsync(() =>
        {
            if (Application.Current?.MainPage != null)
                return Application.Current.MainPage.DisplayAlert(title, message, accept, cancel);
            // Log se non è possibile mostrare la conferma
            Debug.WriteLine($"Impossibile mostrare conferma: {title} - {message}");
            return Task.FromResult(false);
        });
    }

    /// <summary>
    ///     Mostra una finestra di dialogo con scelta tra diverse opzioni.
    /// </summary>
    /// <param name="title">Titolo del dialogo</param>
    /// <param name="cancel">Testo del pulsante di cancellazione</param>
    /// <param name="destruction">Testo dell'opzione distruttiva (può essere null)</param>
    /// <param name="options">Array di opzioni tra cui scegliere</param>
    /// <returns>L'opzione selezionata dall'utente o null se cancellato</returns>
    public static async Task<string?> ShowActionSheetAsync(string title, string cancel, string destruction,
        params string[] options)
    {
        return await MainThread.InvokeOnMainThreadAsync(() =>
        {
            if (Application.Current?.MainPage != null)
                return Application.Current.MainPage.DisplayActionSheet(title, cancel, destruction, options);
            // Log se non è possibile mostrare l'action sheet
            Debug.WriteLine($"Impossibile mostrare action sheet: {title}");
            return Task.FromResult<string?>(null);
        });
    }
}