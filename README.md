# ShuttleBooking

Monorepo con:
- backend API ASP.NET Core + Entity Framework Core + SQL Server
- app mobile Expo/React Native

## Struttura

```text
ShuttleBooking/
├─ backend/
│  ├─ ShuttleBooking.Presentation   # API (controller, middleware, Program)
│  ├─ ShuttleBooking.Business       # service layer e modelli applicativi
│  ├─ ShuttleBooking.Data           # EF Core, entity, repository, migrations
│  └─ ShuttleBooking.Tests          # test xUnit integrazione/mapping
└─ mobile/                          # client React Native (Expo)
```

## Prerequisiti

- .NET SDK 10
- SQL Server (locale o Docker)
- Node.js + npm

## Avvio backend

Da repository root:

```bash
cd backend
dotnet restore
dotnet run --project ShuttleBooking.Presentation
```

Oppure con Docker:

```bash
cd backend
docker compose up --build
```

API in sviluppo: `http://localhost:5000`  
Swagger: `http://localhost:5000/`

## Database e migrazioni

Le migrazioni EF sono in:
- `backend/ShuttleBooking.Data/Migrations`

Comandi utili:

```bash
dotnet ef migrations add <NomeMigrazione> --project backend/ShuttleBooking.Data --startup-project backend/ShuttleBooking.Presentation
dotnet ef database update --project backend/ShuttleBooking.Data --startup-project backend/ShuttleBooking.Presentation
```

## Test backend

```bash
dotnet test backend/ShuttleBookingApi.sln
```

I report di coverage in formato Cobertura (`coverage.cobertura.xml`) vengono generati in `backend/ShuttleBooking.Tests/TestResults/` e sono file temporanei locali (ignorati da Git).

## Avvio mobile

```bash
cd mobile
npm install
npm run start
```

Configurazione API mobile:
- `EXPO_PUBLIC_API_BASE_URL` (default: `http://localhost:5000`)
- `EXPO_PUBLIC_PROFILE_EMAIL` (default: `demo@shuttlebooking.app`)
- `EXPO_PUBLIC_MOCK_MODE=true` per usare repository statici

Esempio:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000 EXPO_PUBLIC_PROFILE_EMAIL=utente@azienda.it npm run start
```

Qualità codice mobile:

```bash
npm run lint
npm run type-check
```

## API principali

- `GET /Shuttles/GetShuttles`
- `GET /Shuttles/GetShuttle/{id}`
- `POST /Shuttles/CreateShuttle`
- `PUT /Shuttles/UpdateShuttle/{id}`
- `DELETE /Shuttles/DeleteShuttle/{id}`
- `POST /User/register`
- `POST /User/LoginWithGoogle`
- `GET /User/byEmail/{email}`

## Note

- Il file `*.Designer.cs` delle migrazioni EF è normale: contiene il metadata snapshot della singola migrazione.
- `coverage.cobertura.xml` è corretto: "Cobertura" è il nome del formato standard del report.
