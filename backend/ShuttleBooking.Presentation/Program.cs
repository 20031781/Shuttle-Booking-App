using System.Reflection;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data;
using ShuttleBooking.Data.Interfaces;
using ShuttleBooking.Data.Repositories;
using ShuttleBooking.Presentation.MappingProfiles;
using ShuttleBooking.Presentation.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);

    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ShuttleBooking API",
        Version = "v1",
        Description = "API per la gestione degli shuttles.",
        Contact = new OpenApiContact
        {
            Name = "Lorenzo Appetito",
            Email = "lorenzoappetito@gmail.com"
        }
    });

    var bearerScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Inserisci il token JWT con prefisso Bearer. Esempio: Bearer {token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    };

    options.AddSecurityDefinition("Bearer", bearerScheme);
});

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKey,
            ValidateIssuer = !string.IsNullOrWhiteSpace(jwtIssuer),
            ValidIssuer = jwtIssuer,
            ValidateAudience = !string.IsNullOrWhiteSpace(jwtAudience),
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddControllers();
builder.Services.AddAuthorization();
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState.Values
            .SelectMany(entry => entry.Errors)
            .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage) ? "Valore non valido." : error.ErrorMessage)
            .Distinct();

        return new BadRequestObjectResult(new ErrorResponse
        {
            Message = string.Join(" ", errors),
            StatusCode = StatusCodes.Status400BadRequest,
            ErrorCode = "VALIDATION_ERROR"
        });
    };
});

builder.Services.AddAutoMapper(_ => { }, typeof(ShuttleProfile).Assembly);
builder.Services.Configure<RateLimitingOptions>(builder.Configuration.GetSection("RateLimiting"));
builder.Services.Configure<AdminDashboardOptions>(builder.Configuration.GetSection("AdminDashboard"));
builder.Services.Configure<PushNotificationsOptions>(builder.Configuration.GetSection("PushNotifications"));

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));

    if (builder.Environment.IsDevelopment())
        options.LogTo(Console.WriteLine, LogLevel.Information)
            .EnableDetailedErrors();
});

builder.Services.AddScoped<IShuttleRepository, ShuttleRepository>();
builder.Services.AddScoped<IShuttleService, ShuttleService>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAdminOpsService, AdminOpsService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddHttpClient<IGoogleAuthService, GoogleAuthService>();
builder.Services.AddHttpClient<IPushNotificationService, FirebasePushNotificationService>();

var app = builder.Build();

app.UseExceptionHandler("/error");
app.UseRateLimiting();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "ShuttleBooking API V1");
        c.RoutePrefix = string.Empty;
    });
}

app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

/// <summary>
///     Entry point dell'applicazione (utile per integrazione con WebApplicationFactory nei test).
/// </summary>
public partial class Program;