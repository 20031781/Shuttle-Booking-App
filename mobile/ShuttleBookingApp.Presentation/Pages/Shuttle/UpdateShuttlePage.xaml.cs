using System.Globalization;
using ShuttleBookingApp.Business.Services;
using ShuttleBookingApp.Presentation.MetodiComuni;

namespace ShuttleBookingApp.Presentation.Pages.Shuttle;

public partial class UpdateShuttlePage
{
    private readonly ShuttleService _shuttleService;

    public UpdateShuttlePage()
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
        ShuttlePicker.SelectedIndexChanged += ShuttlePickerSelectedIndexChanged;
    }

    private void ShuttlePickerSelectedIndexChanged(object? sender, EventArgs e)
    {
        if (ShuttlePicker.SelectedItem is Business.Models.Shuttle selectedShuttle)
            ShuttleNewCapacityEntry.Text = selectedShuttle.Capacity.ToString();
    }

    // Metodo per l'evento click del pulsante aggiorna
    private async void OnUpdateButtonClicked(object sender, EventArgs e)
    {
        GeneralMethod.HideKeyboard();

        // Ottieni i valori delle entry
        var shuttleCapacity =
            int.Parse(ShuttleNewCapacityEntry.Text, NumberStyles.Number, CultureInfo.InvariantCulture);

        if (ShuttlePicker.SelectedItem is not Business.Models.Shuttle selectedShuttle)
        {
            await DisplayAlert("Errore", "Seleziona una navetta da aggiornare", "Ok");
            return;
        }

        // Validazione di base
        if (shuttleCapacity is <= 0 or > 100)
        {
            await DisplayAlert("Errore", "Inserisci una capacità valida", "Ok");
            return;
        }

        // Creare una task per l'aggiornamento della navetta e una task per il timeout
        var updateShuttleTask = _shuttleService.UpdateShuttleAsync(selectedShuttle.Id.ToString(), shuttleCapacity);
        var timeoutTask = Task.Delay(TimeSpan.FromSeconds(5));

        // Attendere il completamento di una delle due tasks
        var completedTask = await Task.WhenAny(updateShuttleTask, timeoutTask);

        if (completedTask == updateShuttleTask)
        {
            // La task dell'aggiornamento della navetta è completata
            var result = await updateShuttleTask;
            if (result)
                await DisplayAlert("Successo", "Navetta aggiornata con successo", "Ok");
            else
                await DisplayAlert("Errore", "Errore durante l'aggiornamento della navetta", "Ok");
        }
        else
        {
            // Il timeout è scaduto
            await DisplayAlert("Errore", "Errore durante l'aggiornamento della navetta", "Ok");
        }
    }

    private void OnPickerSelectedIndexChanged(object sender, EventArgs e)
    {
        if (ShuttlePicker.SelectedIndex != -1) _ = LoadShuttleData();
    }
}