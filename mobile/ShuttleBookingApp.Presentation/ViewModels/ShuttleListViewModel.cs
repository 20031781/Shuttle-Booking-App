using System.Collections.ObjectModel;
using System.ComponentModel;
using ShuttleBookingApp.Business.Models;
using ShuttleBookingApp.Business.Services;

namespace ShuttleBookingApp.Presentation.ViewModels;

public sealed class ShuttleListViewModel : INotifyPropertyChanged
{
    private readonly ShuttleService _shuttleService;

    public ShuttleListViewModel()
    {
        _shuttleService = new ShuttleService();
        Shuttles = [];
        LoadShuttlesCommand = new Command(() => Task.Run(async () => await LoadShuttles()));
        LoadShuttlesCommand.Execute(null);
    }

    public ObservableCollection<Shuttle> Shuttles { get; set; }

    // Cambia il tipo della proprietà
    private Command LoadShuttlesCommand { get; }

    public event PropertyChangedEventHandler? PropertyChanged;

    private async Task LoadShuttles()
    {
        var shuttles = await _shuttleService.GetAllShuttlesAsync();
        Shuttles = new ObservableCollection<Shuttle>(shuttles);
        OnPropertyChanged(nameof(Shuttles));
    }

    private void OnPropertyChanged(string propertyName)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}