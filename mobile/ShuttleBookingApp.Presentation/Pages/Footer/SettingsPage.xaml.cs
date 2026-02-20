namespace ShuttleBookingApp.Presentation.Pages.Footer;

public partial class SettingsPage
{
    public SettingsPage()
    {
        InitializeComponent();
    }

    private async void OnLogoutButtonClicked(object? sender, EventArgs e)
    {
        try
        {
            // Chiediamo conferma prima di effettuare il logout usando DisplayAlert
            var conferma = await DisplayAlert(
                "Conferma Logout",
                "Sei sicuro di voler effettuare il logout?",
                "Sì", "No");

            if (!conferma) return;

            // Effettua operazioni di pulizia della sessione
            await SecureStorage.Default.SetAsync("user_token", string.Empty);

            // Se necessario, cancella altre informazioni dell'utente
            Preferences.Default.Remove("user_id");
            Preferences.Default.Remove("user_email");

            // Naviga alla pagina di login
            await Shell.Current.GoToAsync("//LoginPage");
        }
        catch (Exception ex)
        {
            // Utilizziamo DisplayAlert invece di DialogHelper.ShowAlertAsync
            await DisplayAlert("Errore", $"Si è verificato un errore durante il logout: {ex.Message}", "OK");
        }
    }
}