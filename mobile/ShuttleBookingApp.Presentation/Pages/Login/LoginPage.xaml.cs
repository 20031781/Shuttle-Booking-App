using ShuttleBookingApp.Presentation.ViewModels;

namespace ShuttleBookingApp.Presentation.Pages.Login;

public partial class LoginPage
{
    public LoginPage()
    {
        InitializeComponent();
        BindingContext = new LoginViewModel();
    }
}