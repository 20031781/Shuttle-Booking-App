# ShuttleBooking

Monorepo con backend ASP.NET Core + EF Core e app mobile Expo/React Native.

## Stack e struttura

```text
ShuttleBooking/
├─ backend/
│  ├─ ShuttleBooking.Presentation   # API, controller, Program, middleware
│  ├─ ShuttleBooking.Business       # servizi applicativi e DTO
│  ├─ ShuttleBooking.Data           # DbContext, entity, repository, migrations
│  └─ ShuttleBooking.Tests          # test xUnit (integrazione + unit)
├─ mobile/                          # app React Native (Expo)
└─ .github/workflows/ci-cd.yml      # pipeline CI/CD
```

Prerequisiti:

- .NET SDK 10
- SQL Server (locale o Docker)
- Node.js 20+ e npm

## Avvio locale

Backend:

```bash
cd backend
dotnet restore
dotnet run --project ShuttleBooking.Presentation
```

Swagger locale: `http://localhost:5000/`

Mobile:

```bash
cd mobile
npm install
npm run start
```

Variabili mobile:

- `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:5000`)
- `EXPO_PUBLIC_PROFILE_EMAIL` (default `demo@shuttlebooking.app`)
- `EXPO_PUBLIC_MOCK_MODE=true` per repository mock

Esempio:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000 EXPO_PUBLIC_PROFILE_EMAIL=utente@azienda.it npm run start
```

## Migrazioni e database

Le migrazioni EF Core sono in `backend/ShuttleBooking.Data/Migrations`.

```bash
dotnet ef migrations add <NomeMigrazione> --project backend/ShuttleBooking.Data --startup-project backend/ShuttleBooking.Presentation
dotnet ef database update --project backend/ShuttleBooking.Data --startup-project backend/ShuttleBooking.Presentation
```

`*.Designer.cs` nelle migrazioni è normale: contiene metadata/snapshot della migrazione.

## Flussi implementati

Shuttle:

- CRUD shuttle
- disponibilità posti per data (`AvailableSeats`)

Booking:

- creazione prenotazione
- annullamento (soft cancel)
- storico utente
- disponibilità realtime (backend per data + refresh periodico mobile)
- protezione da doppia prenotazione attiva stesso utente/shuttle/data

User/Auth:

- registrazione utente
- login Google con token validation
- emissione JWT

## Endpoint principali

Shuttle:

- `GET /Shuttles/GetShuttles?date=<ISO_DATE>`
- `GET /Shuttles/GetShuttle/{id}`
- `POST /Shuttles/CreateShuttle`
- `PUT /Shuttles/UpdateShuttle/{id}`
- `DELETE /Shuttles/DeleteShuttle/{id}`

Booking:

- `POST /Bookings/CreateBooking`
- `PUT /Bookings/CancelBooking/{bookingId}`
- `GET /Bookings/GetUserHistory/{email}`
- `GET /Bookings/GetShuttleAvailability?date=<ISO_DATE>`

User/Auth:

- `POST /User/register`
- `POST /User/LoginWithGoogle`
- `GET /User/byEmail/{email}`

## Qualità, test e CI/CD

Comandi locali:

```bash
dotnet test backend/ShuttleBookingApi.sln
cd mobile
npm run type-check
npm run lint
```

Pipeline `.github/workflows/ci-cd.yml`:

- test backend automatici
- lint/type-check mobile
- build artifact (publish API and archive mobile)
- deploy immagine API su GHCR (branch `main`/`master`)

Report coverage:

- il formato corretto e `coverage.cobertura.xml` (standard Cobertura)
- i file in `backend/ShuttleBooking.Tests/TestResults/` sono output locali e ignorati da Git
