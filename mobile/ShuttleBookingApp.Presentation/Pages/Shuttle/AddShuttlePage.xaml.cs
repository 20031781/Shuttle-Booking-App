using ShuttleBookingApp.Business.Services;
using ShuttleBookingApp.Presentation.MetodiComuni;

namespace ShuttleBookingApp.Presentation.Pages.Shuttle;

public partial class AddShuttlePage
{
    private readonly ShuttleService _shuttleService;

    public AddShuttlePage()
    {
        InitializeComponent();
        _shuttleService = new ShuttleService();
    }
    
    private async void OnSaveButtonClicked(object sender, EventArgs e)
    {
        GeneralMethod.HideKeyboard();
        
        // Ottieni i valori delle entry
        var shuttleName = ShuttleNameEntry.Text;
        var isNumeric = int.TryParse(ShuttleCapacityEntry.Text, out var shuttleCapacity);

        // Validazione di base
        if (string.IsNullOrWhiteSpace(shuttleName) || !isNumeric || shuttleCapacity <= 0 || shuttleCapacity > 100)
        {
            await DisplayAlert("Errore", "Inserisci un nome e una capacità validi", "Ok");
            return;
        }

        // Pulizia delle entry
        ShuttleNameEntry.Text = string.Empty;
        ShuttleCapacityEntry.Text = string.Empty;
        
        // Creare una task per la creazione della navetta e una task per il timeout
        var createShuttleTask = _shuttleService.CreateShuttleAsync(shuttleName, shuttleCapacity);
        var timeoutTask = Task.Delay(TimeSpan.FromSeconds(5));

        // Attendere il completamento di una delle due tasks
        var completedTask = await Task.WhenAny(createShuttleTask, timeoutTask);

        if (completedTask == createShuttleTask)
        {
            // La task della creazione della navetta è completata
            var response = await createShuttleTask;
            if (response)
                await DisplayAlert("Successo", "Navetta creata con successo", "Ok");
            else
                await DisplayAlert("Errore", "Impossibile creare la navetta", "Ok");
        }
        else
        {
            // Il timeout è scaduto
            await DisplayAlert("Errore", "Impossibile creare la navetta", "Ok");
        }
    }
}