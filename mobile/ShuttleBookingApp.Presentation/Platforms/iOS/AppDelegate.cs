using Foundation;
using UIKit;

namespace ShuttleBookingApp.Presentation;

[Register("AppDelegate")]
public class AppDelegate : MauiUIApplicationDelegate
{
    protected override MauiApp CreateMauiApp() => MauiProgram.CreateMauiApp();

    public override bool OpenUrl(UIApplication app, NSUrl url, NSDictionary options)
    {
        if (Microsoft.Maui.Authentication.WebAuthenticator.OpenUrl(url))
        {
            return true;
        }
        
        return base.OpenUrl(app, url, options);
    }
    
    public override bool ContinueUserActivity(UIApplication application, NSUserActivity userActivity, UIApplicationRestorationHandler completionHandler)
    {
        if (Microsoft.Maui.Authentication.WebAuthenticator.ContinueUserActivity(userActivity))
        {
            return true;
        }
        
        return base.ContinueUserActivity(application, userActivity, completionHandler);
    }
}