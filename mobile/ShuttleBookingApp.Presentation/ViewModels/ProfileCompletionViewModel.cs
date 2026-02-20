using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows.Input;
using ShuttleBookingApp.Business.Models;
using ShuttleBookingApp.Presentation.Repository;

namespace ShuttleBookingApp.Presentation.ViewModels;

public class ProfileCompletionViewModel : INotifyPropertyChanged
{
    private readonly User? _user;
    private readonly IUserRepository _userRepository;
    private string _city;
    private bool _isBusy;
    private string _phone;
    private string _phoneCountryCode;

    public ProfileCompletionViewModel(User? user)
    {
        _user = user;
        _userRepository = new UserService();

        // Inizializza i campi con i valori dell'utente
        _city = user.City;
        _phone = user.Phone ?? string.Empty;
        _phoneCountryCode = user.PhoneCountryCode;

        SaveCommand = new Command(
            async () => await SaveProfile(),
            () => !IsBusy && IsValid());
    }

    public string City
    {
        get => _city;
        set
        {
            if (_city != value)
            {
                _city = value;
                OnPropertyChanged();
                (SaveCommand as Command)?.ChangeCanExecute();
            }
        }
    }

    public string Phone
    {
        get => _phone;
        set
        {
            if (_phone != value)
            {
                _phone = value;
                OnPropertyChanged();
                (SaveCommand as Command)?.ChangeCanExecute();
            }
        }
    }

    public string PhoneCountryCode
    {
        get => _phoneCountryCode;
        set
        {
            if (_phoneCountryCode != value)
            {
                _phoneCountryCode = value;
                OnPropertyChanged();
                (SaveCommand as Command)?.ChangeCanExecute();
            }
        }
    }

    public bool IsBusy
    {
        get => _isBusy;
        set
        {
            _isBusy = value;
            OnPropertyChanged();
            (SaveCommand as Command)?.ChangeCanExecute();
        }
    }

    public ICommand SaveCommand { get; }

    public event PropertyChangedEventHandler? PropertyChanged;

    private bool IsValid()
    {
        // Controlla che i campi required siano riempiti con valori significativi
        // Non accettiamo spazi o valori come "Roma" o "+39" se erano i default
        return !string.IsNullOrWhiteSpace(City) &&
               !string.IsNullOrWhiteSpace(PhoneCountryCode) &&
               City.Trim().Length > 2 &&
               PhoneCountryCode.Trim().Length >= 2;
    }

    private async Task SaveProfile()
    {
        if (IsBusy)
            return;

        try
        {
            IsBusy = true;

            // Aggiorna i dati dell'utente
            _user.City = City;
            _user.Phone = Phone;
            _user.PhoneCountryCode = PhoneCountryCode;

            // Salva le modifiche nel database
            var updatedUser = await _userRepository.CreateUser(_user);

            if (updatedUser == null)
            {
                await Application.Current.MainPage.DisplayAlert(
                    "Errore",
                    "Non è stato possibile salvare le modifiche al profilo",
                    "Ok");
                return;
            }

            // Mostra un messaggio di successo
            await Application.Current.MainPage.DisplayAlert(
                "Successo",
                "Profilo aggiornato con successo",
                "Ok");

            // Naviga alla pagina principale
            MainThread.BeginInvokeOnMainThread(() =>
            {
                if (Application.Current != null)
                {
                    var appShell = new AppShell();
                    Application.Current.MainPage = appShell;
                }
            });
        }
        catch (Exception ex)
        {
            await Application.Current.MainPage.DisplayAlert(
                "Errore",
                $"Si è verificato un errore: {ex.Message}",
                "Ok");
        }
        finally
        {
            IsBusy = false;
        }
    }

    protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}