using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using Serilog.Context;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data;
using ShuttleBooking.Data.Interfaces;
using ShuttleBooking.Data.Repositories;
using ShuttleBooking.Presentation.MappingProfiles;

// Logger minimo per catturare eventuali errori prima che la configurazione completa
// (letta da appsettings + DI) sia disponibile - es. un problema nella build del builder stesso.
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    Log.Information("Avvio ShuttleBooking API");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, services, loggerConfiguration) => loggerConfiguration
            .ReadFrom.Configuration(context.Configuration)
            .ReadFrom.Services(services)
            .Enrich.FromLogContext()
            .Enrich.WithMachineName()
            .WriteTo.Console(
                outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {TraceId} {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                Path.Combine(AppContext.BaseDirectory, "logs", "shuttlebooking-.log"),
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 14,
                outputTemplate:
                "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {TraceId} {Message:lj}{NewLine}{Exception}"),
        // Non tocca Log.Logger (resta il bootstrap logger console-only): necessario perché
        // i test creano più WebApplicationFactory nello stesso processo e il logger statico
        // può essere "congelato" una sola volta.
        true);

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
    builder.Services.AddAuthorization(options =>
    {
        // Nessun endpoint è anonimo per omissione: un'azione senza [Authorize] deve
        // dichiararlo esplicitamente con [AllowAnonymous], non ottenerlo per distrazione.
        options.FallbackPolicy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .Build();
    });
    builder.Services.Configure<ApiBehaviorOptions>(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState.Values
                .SelectMany(entry => entry.Errors)
                .Select(error =>
                    string.IsNullOrWhiteSpace(error.ErrorMessage) ? "Valore non valido." : error.ErrorMessage)
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

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.OnRejected = async (context, cancellationToken) =>
        {
            context.HttpContext.Response.Headers["Retry-After"] = "60";
            context.HttpContext.Response.ContentType = "application/json";

            var errorResponse = new ErrorResponse
            {
                Message = "Troppe richieste. Per favore riprova più tardi.",
                StatusCode = StatusCodes.Status429TooManyRequests,
                ErrorCode = "RATE_LIMIT_EXCEEDED"
            };
            await context.HttpContext.Response.WriteAsync(JsonSerializer.Serialize(errorResponse),
                cancellationToken);
        };

        // Limite per IP client su una finestra scorrevole di un minuto - stesso comportamento
        // del middleware custom che sostituisce, ma con eviction automatica delle partizioni
        // inattive (il dizionario statico precedente cresceva senza mai liberare memoria).
        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        {
            var clientIp = GetClientIpAddress(httpContext);

            // Risolto a runtime (non catturato alla registrazione): builder.Configuration non
            // riflette ancora eventuali override applicati da WebApplicationFactory nei test,
            // che vengono composti solo quando l'host è completamente costruito.
            var maxRequestsPerMinute = httpContext.RequestServices.GetRequiredService<IConfiguration>()
                .GetValue<int?>("RateLimiting:MaxRequestsPerMinute") ?? 60;

            return RateLimitPartition.GetSlidingWindowLimiter(clientIp, _ => new SlidingWindowRateLimiterOptions
            {
                PermitLimit = maxRequestsPerMinute,
                Window = TimeSpan.FromMinutes(1),
                SegmentsPerWindow = 6,
                QueueLimit = 0
            });
        });
    });

    builder.Services.Configure<AdminDashboardOptions>(builder.Configuration.GetSection("AdminDashboard"));
    builder.Services.Configure<ManagerDashboardOptions>(builder.Configuration.GetSection("ManagerDashboard"));
    builder.Services.Configure<PushNotificationsOptions>(builder.Configuration.GetSection("PushNotifications"));

    // L'app mobile nativa non è soggetta a CORS: questa policy esiste solo per eventuali
    // client browser futuri. Nessuna origine in config = nessuna origine ammessa (WithOrigins
    // con array vuoto non fa mai match, quindi il default resta "nega tutto" senza eccezioni.
    var corsAllowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    const string corsPolicyName = "Default";
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(corsPolicyName, policy =>
            policy.WithOrigins(corsAllowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod());
    });

    builder.Services.AddDbContext<AppDbContext>(options =>
    {
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));

        if (builder.Environment.IsDevelopment())
            options.EnableDetailedErrors();
    });

    builder.Services.AddScoped<IShuttleRepository, ShuttleRepository>();
    builder.Services.AddScoped<IShuttleService, ShuttleService>();
    builder.Services.AddScoped<IBookingRepository, BookingRepository>();
    builder.Services.AddScoped<IBookingService, BookingService>();
    builder.Services.AddScoped<IUserRepository, UserRepository>();
    builder.Services.AddScoped<IUserRoleRepository, UserRoleRepository>();
    builder.Services.AddScoped<IUserService, UserService>();
    builder.Services.AddScoped<IAdminOpsService, AdminOpsService>();
    builder.Services.AddScoped<IJwtService, JwtService>();
    builder.Services.AddSingleton<IGoogleAuthService, GoogleAuthService>();
    builder.Services.AddHttpClient<IEmailSender, ResendEmailSender>();
    builder.Services.AddHttpClient<IPushNotificationService, FirebasePushNotificationService>();

    var app = builder.Build();

    // I valori di esempio sono volutamente innocui e finiscono nel repository:
    // in produzione sarebbe pericoloso avviarsi e scoprire solo al primo login o
    // alla prima prenotazione che Google/Resend non sono realmente configurati.
    // La configurazione risolta dal container include anche gli override finali
    // (per esempio quelli applicati dall'host di deploy o dai test di integrazione).
    if (app.Environment.IsProduction())
    {
        var configuration = app.Services.GetRequiredService<IConfiguration>();
        var googleAudiences = GoogleAudienceConfiguration.GetAudiences(configuration);
        if (googleAudiences.Count == 0 || googleAudiences.Any(IsPlaceholderConfigurationValue))
            throw new InvalidOperationException(
                "GoogleAuth richiede almeno un OAuth client ID reale in Production.");

        RequireProductionConfiguration(configuration, "Resend:ApiKey");
        RequireProductionConfiguration(configuration, "Resend:FromAddress");
    }

    // Deve avvolgere l'intera pipeline (incluso UseExceptionHandler): l'handler rientra
    // nella pipeline sullo stesso HttpContext, quindi il TraceId resta nel LogContext anche
    // per i log emessi durante la gestione di un errore.
    app.Use(async (context, next) =>
    {
        using (LogContext.PushProperty("TraceId", context.TraceIdentifier))
        {
            await next();
        }
    });

    app.UseExceptionHandler("/error");
    app.UseSerilogRequestLogging();
    app.UseRateLimiter();

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
    app.UseCors(corsPolicyName);
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();
    app.Run();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    // HostAbortedException è sollevata deliberatamente dagli strumenti di design-time EF
    // (es. `dotnet ef migrations add`) per costruire l'host senza avviarlo: non è un errore.
    Log.Fatal(ex, "ShuttleBooking API terminata in modo imprevisto durante l'avvio");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

static string GetClientIpAddress(HttpContext context)
{
    var ip = context.Connection.RemoteIpAddress?.ToString();

    var forwardedIp = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
    if (!string.IsNullOrEmpty(forwardedIp)) ip = forwardedIp.Split(',')[0].Trim();

    return string.IsNullOrWhiteSpace(ip) ? "unknown" : ip;
}

static void RequireProductionConfiguration(IConfiguration configuration, string key)
{
    var value = configuration[key]?.Trim();
    if (string.IsNullOrWhiteSpace(value) || IsPlaceholderConfigurationValue(value))
        throw new InvalidOperationException($"{key} deve essere configurato con un valore reale in Production.");
}

static bool IsPlaceholderConfigurationValue(string value) =>
    value.Contains("CHANGE_ME", StringComparison.OrdinalIgnoreCase)
    || value.Contains("YOUR_", StringComparison.OrdinalIgnoreCase);

/// <summary>
///     Entry point dell'applicazione (utile per integrazione con WebApplicationFactory nei test).
/// </summary>
public partial class Program;