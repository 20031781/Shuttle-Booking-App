using Microsoft.Maui.Storage;
using ShuttleBookingApp.Presentation.Pages;
using ShuttleBookingApp.Presentation.Pages.Footer;
using ShuttleBookingApp.Presentation.Pages.Login;
using MapPage = ShuttleBookingApp.Presentation.Pages.Footer.MapPage;
using SettingsPage = ShuttleBookingApp.Presentation.Pages.Footer.SettingsPage;

namespace ShuttleBookingApp.Presentation;

public partial class AppShell
{
    public AppShell()
    {
        InitializeComponent();
        RegisterRoutes();
    }

    protected override async void OnAppearing()
    {
        try
        {
            base.OnAppearing();

            if (Current == null) return;
            
            // Verifica se l'utente è già autenticato controllando token nel SecureStorage
            var token = await SecureStorage.Default.GetAsync("user_token");
            var isAuthenticated = !string.IsNullOrEmpty(token);
            
            // Opzionalmente, puoi verificare anche se il token è valido
            // Ad esempio, controllando la data di scadenza o facendo una richiesta di validazione
            
            if (!isAuthenticated)
                await Current.GoToAsync("//LoginPage");
            else
                await Current.GoToAsync("//main/MapPage");
        }
        catch (Exception e)
        {
            Console.WriteLine($"Errore durante il controllo dell'autenticazione: {e.Message}");
            // In caso di errore, è più sicuro considerare l'utente come non autenticato
            await Current.GoToAsync("//LoginPage");
        }
    }

    private static void RegisterRoutes()
    {
        try
        {
            // Registra le route per le pagine
            Routing.RegisterRoute("LoginPage", typeof(LoginPage));
            Routing.RegisterRoute("MapPage", typeof(MapPage));
            Routing.RegisterRoute("AdminPage", typeof(AdminPage));
            Routing.RegisterRoute("BookingPage", typeof(BookingPage));
            Routing.RegisterRoute("SettingsPage", typeof(SettingsPage));
            Routing.RegisterRoute("ProfileCompletionPage", typeof(ProfileCompletionPage));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Errore durante la registrazione delle rotte: {ex.Message}");
        }
    }
}