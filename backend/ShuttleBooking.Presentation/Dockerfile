# Immagine base per l'app ASP.NET
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

# Immagine per la build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copia i file .csproj dei vari progetti
COPY ["ShuttleBooking.Presentation/ShuttleBooking.Presentation.csproj", "ShuttleBooking.Presentation/"]
COPY ["ShuttleBooking.Business/ShuttleBooking.Business.csproj", "ShuttleBooking.Business/"]
COPY ["ShuttleBooking.Data/ShuttleBooking.Data.csproj", "ShuttleBooking.Data/"]

# Esegui il ripristino delle dipendenze
RUN dotnet restore "ShuttleBooking.Presentation/ShuttleBooking.Presentation.csproj"

# Copia il resto del codice sorgente
COPY . .

# Lavora sulla Presentazione per la compilazione
WORKDIR "/src/ShuttleBooking.Presentation"
RUN dotnet build "ShuttleBooking.Presentation.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Fase di pubblicazione
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "ShuttleBooking.Presentation.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Immagine finale
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ShuttleBooking.Presentation.dll"]