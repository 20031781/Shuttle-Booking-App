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
docker compose up -d db
dotnet restore
dotnet run --project ShuttleBooking.Presentation --launch-profile http
```

Nota DB Docker: per evitare conflitti con altri SQL Server locali, questo compose espone SQL Server su
`localhost:14330` (container interno `1433`).

Swagger locale: `http://localhost:5000/`
Swagger da altri device in LAN: `http://<IP-PC>:5000/`

Mobile:

```bash
cd mobile
npm install
npm run start
```

Variabili mobile:

- `EXPO_PUBLIC_API_BASE_URL` (opzionale: se assente, l'app prova auto-detect host dev; fallback Android
  `http://10.0.2.2:5000`, altrimenti `http://localhost:5000`)
- `EXPO_PUBLIC_PROFILE_EMAIL` (default `demo@shuttlebooking.app`)
- `EXPO_PUBLIC_MOCK_MODE=true` per repository mock

Esempio:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000 EXPO_PUBLIC_PROFILE_EMAIL=utente@azienda.it npm run start
```

Se usi un device fisico:

- backend in ascolto su `0.0.0.0:5000` (profilo `http` in `launchSettings.json`)
- apri la porta `5000` nel firewall locale se necessario

## Script utili

### Sviluppo rapido

- `npm start` → Expo Go / dev build con QR e hot reload (premere `s` per Expo Go).

### Sviluppo nativo (device reali)

- ```bash
  npx expo run:android
  ```
- `npm run ios` → build nativa iOS locale (Xcode).

> ⚠️ Richiede Android SDK / Xcode locali.

### Controllo qualità e test

Da qui esegui:

```bash
Set-Location ..\mobile; npm run lint; npm run type-check; npm test
```

```bash
Set-Location ..\mobile; npx expo-doctor; npx expo install --fix; npm outdated
```

### Aggiornamento dipendenze

```bash
npm update
```

### Build EAS (Android)

AAB per Play Store (profilo `production`):

> Committare i file prima di eseguire il comando perché EAS builda dal codice remoto (Git) non dal working tree locale.

```bash
npm run aab
```

Lista build recenti e relativo stato:

```bash
npx eas-cli build:list --platform android --limit 5
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
