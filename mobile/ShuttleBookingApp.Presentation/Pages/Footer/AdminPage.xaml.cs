using ShuttleBookingApp.Presentation.Pages.Shuttle;

namespace ShuttleBookingApp.Presentation.Pages.Footer;

public partial class AdminPage
{
    public AdminPage()
    {
        InitializeComponent();
    }
    
    private async void OpenShuttleListPage(object? sender, EventArgs e)
    {
        try
        {
            await Navigation.PushAsync(new ShuttleListPage());
        }
        catch (Exception exception)
        {
            await DisplayAlert("Errore", $"{exception}", "Ok");
        }
    }

    private async void AddShuttlePage(object? sender, EventArgs e)
    {
        try
        {
            await Navigation.PushAsync(new AddShuttlePage());
        }
        catch (Exception exception)
        {
            await DisplayAlert("Errore", $"{exception}", "Ok");
        }
    }

    private async void UpdateShuttle(object? sender, EventArgs e)
    {
        try
        {
            await Navigation.PushAsync(new UpdateShuttlePage());
        }
        catch (Exception exception)
        {
            await DisplayAlert("Errore", $"{exception}", "Ok");
        }
    }

    private async void DeleteShuttle(object? sender, EventArgs e)
    {
        try
        {
            await Navigation.PushAsync(new DeleteShuttlePage());
        }
        catch (Exception exception)
        {
            await DisplayAlert("Errore", $"{exception}", "Ok");
        }
    }
}