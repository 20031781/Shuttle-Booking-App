using ShuttleBookingApp.Presentation.ViewModels;

namespace ShuttleBookingApp.Presentation.Pages.Shuttle;

public partial class ShuttleListPage
{
    public ShuttleListPage()
    {
        InitializeComponent();
        BindingContext = new ShuttleListViewModel();
    }
}