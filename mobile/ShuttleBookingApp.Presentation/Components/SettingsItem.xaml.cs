namespace ShuttleBookingApp.Presentation.Components;

public partial class SettingsItem
{
    // Proprietà bindable per il Titolo
    public static readonly BindableProperty TitleProperty =
        BindableProperty.Create(
            nameof(Title),
            typeof(string),
            typeof(SettingsItem));

    // Proprietà bindable per la View personalizzata a destra
    public static readonly BindableProperty RightViewProperty =
        BindableProperty.Create(
            nameof(RightView),
            typeof(View),
            typeof(SettingsItem),
            propertyChanged: OnRightViewChanged); // Aggiunto callback

    public SettingsItem()
    {
        InitializeComponent();
        BindingContext = this;
    }

    public string Title
    {
        get => (string)GetValue(TitleProperty);
        set => SetValue(TitleProperty, value);
    }

    public View RightView
    {
        get => (View)GetValue(RightViewProperty);
        set => SetValue(RightViewProperty, value);
    }

    // Callback per aggiornare il contenuto del ContentPresenter
    private static void OnRightViewChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var control = (SettingsItem)bindable;
        if (control.RightContentPresenter != null) control.RightContentPresenter.Content = (View)newValue;
    }
}