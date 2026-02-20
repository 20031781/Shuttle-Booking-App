using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data;
using ShuttleBooking.Data.Interfaces;
using ShuttleBooking.Data.Repositories;
using ShuttleBooking.Presentation.MappingProfiles;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => 
{
    // Configura la documentazione XML
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);

    // Configura altre opzioni di Swagger
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ShuttleBooking API",
        Version = "v1",
        Description = "API per la gestione degli shuttles.",
        Contact = new OpenApiContact { Name = "Lorenzo Appetito", Email = "lorenzoappetito@gmail.com" }
    });
});

// Configura i servizi
builder.Services.AddControllers();

// Configurazione di AutoMapper
builder.Services.AddAutoMapper(typeof(ShuttleProfile));

// Configura Entity Framework
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
        .LogTo(Console.WriteLine, LogLevel.Information));

// Configura la Dependency Injection per i repository
builder.Services.AddScoped<IShuttleRepository, ShuttleRepository>();
builder.Services.AddScoped<IShuttleService, ShuttleService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddHttpClient<IGoogleAuthService, GoogleAuthService>();

var app = builder.Build();

// #if DEBUG
// app.Urls.Add("http://*:5000");  // Con questa riga riesco a chiamare le API in locale dal mio cellulare
// #endif

// --- Bind su tutte le interfacce (0.0.0.0) per permettere accesso dalla LAN ---
// builder.WebHost.ConfigureKestrel(options => { options.ListenAnyIP(5000); });

// Configura Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ShuttleBooking API V1");
        c.RoutePrefix = string.Empty; // Imposta Swagger come pagina di default
    });
}

app.UseAuthorization();
app.MapControllers();
app.Run();