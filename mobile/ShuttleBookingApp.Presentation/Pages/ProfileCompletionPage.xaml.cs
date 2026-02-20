using ShuttleBookingApp.Business.Models;
using ShuttleBookingApp.Presentation.ViewModels;

namespace ShuttleBookingApp.Presentation.Pages;

public partial class ProfileCompletionPage
{
    public ProfileCompletionPage(User? user)
    {
        InitializeComponent();

        var viewModel = new ProfileCompletionViewModel(user);
        BindingContext = viewModel;
    }
}