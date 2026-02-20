using Android.Content;
using Android.Views.InputMethods;

namespace ShuttleBookingApp.Presentation.MetodiComuni;

public class GeneralMethod
{
    public static void HideKeyboard()
    {
        var inputMethodManager = (InputMethodManager)Platform.CurrentActivity?.GetSystemService(Context.InputMethodService)!;
        if (Platform.CurrentActivity?.CurrentFocus != null)
        {
            inputMethodManager.HideSoftInputFromWindow(Platform.CurrentActivity.CurrentFocus.WindowToken, HideSoftInputFlags.None);
        }
    }
}