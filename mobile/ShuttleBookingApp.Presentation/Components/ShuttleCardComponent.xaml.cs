namespace ShuttleBookingApp.Presentation.Components;

public partial class ShuttleCardComponent
{
    private static readonly BindableProperty TextColorProperty =
        BindableProperty.Create(nameof(TextColor), typeof(Color), typeof(ShuttleCardComponent), Colors.Black);

    public ShuttleCardComponent()
    {
        InitializeComponent();
    }

    public Color TextColor
    {
        get => (Color)GetValue(TextColorProperty);
        init => SetValue(TextColorProperty, value);
    }
}