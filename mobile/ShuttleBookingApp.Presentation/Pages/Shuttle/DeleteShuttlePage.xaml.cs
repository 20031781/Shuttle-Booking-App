using System.Globalization;
using ShuttleBookingApp.Business.Services;

namespace ShuttleBookingApp.Presentation.Pages.Shuttle;

public partial class DeleteShuttlePage
{
    private readonly ShuttleService _shuttleService;

    public DeleteShuttlePage()
    {
        InitializeComponent();
        _shuttleService = new ShuttleService();
        _ = LoadShuttleData();
    }

    private async Task LoadShuttleData()
    {
        var shuttles = await _shuttleService.GetAllShuttlesAsync();
        ShuttlePicker.ItemDisplayBinding = new Binding("Name");
        ShuttlePicker.ItemsSource = shuttles;
    }

    // Metodo per l'evento click del pulsante cancella
    private async void OnDeleteButtonClicked(object sender, EventArgs e)
    {
        if (ShuttlePicker.SelectedItem is not Business.Models.Shuttle selectedShuttle)
        {
            await DisplayAlert("Errore", "Seleziona una navetta da cancellare", "Ok");
            return;
        }

        var response = await DisplayAlert("Conferma cancellazione",
            $"Sei sicuro di voler cancellare la navetta: '{selectedShuttle.Name}'?", "Sì", "No");
        if (!response) return;

        // Creare una task per la cancellazione della navetta e una task per il timeout
        var deleteShuttleTask = _shuttleService.DeleteShuttleAsync(selectedShuttle.Id.ToString());
        var timeoutTask = Task.Delay(TimeSpan.FromSeconds(5));

        // Attendere il completamento di una delle due tasks
        var completedTask = await Task.WhenAny(deleteShuttleTask, timeoutTask);

        if (completedTask == deleteShuttleTask)
        {
            // La task della cancellazione della navetta è completata
            var result = await deleteShuttleTask;
            if (result)
                await DisplayAlert("Successo", "La navetta è stata cancellata", "Ok");
            else
                await DisplayAlert("Errore", "Impossibile cancellare la navetta", "Ok");
        }
        else
        {
            // Il timeout è scaduto
            await DisplayAlert("Errore", "Impossibile cancellare la navetta", "Ok");
        }
    }

    private void OnPickerSelectedIndexChanged(object sender, EventArgs e)
    {
        if (ShuttlePicker.SelectedIndex != -1) _ = LoadShuttleData();
    }
}