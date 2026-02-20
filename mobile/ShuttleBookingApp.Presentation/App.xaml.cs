namespace ShuttleBookingApp.Presentation;

public partial class App
{
    public App()
    {
        InitializeComponent();

        MainPage = new AppShell();
        // La logica di navigazione è gestita nel metodo OnAppearing di AppShell
    }
}