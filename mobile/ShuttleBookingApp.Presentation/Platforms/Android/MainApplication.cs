using Android.App;
using Android.Runtime;

namespace ShuttleBookingApp.Presentation;

[Application(UsesCleartextTraffic = true)]
public class MainApplication(IntPtr handle, JniHandleOwnership ownership) : MauiApplication(handle, ownership)
{
    protected override MauiApp CreateMauiApp()
    {
        return MauiProgram.CreateMauiApp();
    }
}