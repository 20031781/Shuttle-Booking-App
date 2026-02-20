namespace ShuttleBookingApp.Presentation.Components;

/// <summary>
///     Componente che visualizza il titolo della pagina.
/// </summary>
public partial class TitlePageComponent
{
    private static readonly BindableProperty TextProperty =
        BindableProperty.Create(nameof(Text), typeof(string), typeof(TitlePageComponent), string.Empty,
            propertyChanged: OnTextChanged);

    private static readonly BindableProperty TextColorProperty =
        BindableProperty.Create(nameof(TextColor), typeof(Color), typeof(TitlePageComponent), Colors.Black,
            propertyChanged: OnTextColorChanged);

    public TitlePageComponent()
    {
        InitializeComponent();
    }

    public string Text
    {
        get => (string)GetValue(TextProperty);
        init => SetValue(TextProperty, value);
    }

    public Color TextColor
    {
        get => (Color)GetValue(TextColorProperty);
        set => SetValue(TextColorProperty, value);
    }

    private static void OnTextChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var control = (TitlePageComponent)bindable;
        control.Label.Text = (string)newValue;
    }

    private static void OnTextColorChanged(BindableObject bindable, object oldValue, object newValue)
    {
        var control = (TitlePageComponent)bindable;
        control.Label.TextColor = (Color)newValue;
    }
}