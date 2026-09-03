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

```powershell
cd backend
Copy-Item .env.example .env
# Modifica backend/.env e imposta DB_SA_PASSWORD e JWT_SECRET_KEY.
# Copia la configurazione di esempio e valorizza gli stessi segreti:
Copy-Item ShuttleBooking.Presentation/appsettings.example.json ShuttleBooking.Presentation/appsettings.json
# In appsettings.json imposta la password SQL Server uguale a DB_SA_PASSWORD
# e una chiave JWT casuale lunga almeno 32 caratteri.
docker compose up -d db
dotnet restore ShuttleBooking.sln
dotnet ef database update --project ShuttleBooking.Data --startup-project ShuttleBooking.Presentation
dotnet run --project ShuttleBooking.Presentation --launch-profile http
```

Nota DB Docker: per evitare conflitti con altri SQL Server locali, questo compose espone SQL Server su
`localhost:14330` (container interno `1433`).

Il file `backend/.env` e `ShuttleBooking.Presentation/appsettings.json` sono locali e ignorati da Git. In una prima
installazione il database è vuoto: accedi con un'email presente in
`AdminDashboard:AllowedEmails` o `ManagerDashboard:AllowedEmails`, apri la tab Manager e crea il primo shuttle inserendo
nome, capacità e data/ora.

Configurazione Google ed email:

- Inserisci lo stesso Web OAuth Client ID in `GoogleAuth:ClientId` (backend) e
  `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` (mobile). Non è un segreto, ma deve essere autorizzato per la stessa app OAuth per
  superare la verifica dell'audience dell'ID token.
- Per le email transazionali configura `Resend:ApiKey` e `Resend:FromAddress`; opzionalmente imposta
  `Email:LogoUrl` a un URL pubblico assoluto. I valori di esempio sono placeholder e non funzionano finché non vengono
  sostituiti.
- Per Android, carica `GOOGLE_SERVICES_JSON` come file environment variable in EAS. Per iOS abilita
  `EXPO_PUBLIC_GOOGLE_SIGN_IN_IOS_ENABLED=true` solo dopo aver configurato anche `GOOGLE_SERVICE_INFO_PLIST`.
- In ambiente `Production` l'API rifiuta l'avvio finché Google e Resend contengono valori vuoti o placeholder.

Swagger locale: `http://localhost:5000/`
Swagger da altri device in LAN: `http://<IP-PC>:5000/`

Mobile:

```bash
cd mobile
npm install
npm run start
```

Variabili mobile:

- `EXPO_PUBLIC_API_URL` (opzionale; se assente, usa `EXPO_PUBLIC_API_BASE_URL` come alias legacy, poi auto-detect host
  dev e fallback Android `http://10.0.2.2:5000`, altrimenti `http://localhost:5000`)
- `EXPO_PUBLIC_MOCK_MODE=true` per repository mock
- `EXPO_PUBLIC_UPDATE_JSON_URL` per il controllo aggiornamenti Android
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` per il login Google nativo

Esempio:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:5000 npm run start
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

### Versioni e aggiornamenti obbligatori

La configurazione Expo principale è in [`mobile/app.base.json`](mobile/app.base.json). Il campo `expo.version` contiene
il numero della release (ora `"5"`), nello stesso stile di Split Expenses: prima di creare il prossimo AAB sostituiscilo
con il numero successivo. Il `versionCode` Android viene incrementato da EAS perché `appVersionSource` è `remote`; per
una build locale deve essere allineato al codice che vuoi caricare su Play.

Il manifest pubblico per il controllo aggiornamenti è
[`backend/ShuttleBooking.Presentation/wwwroot/update.json`](backend/ShuttleBooking.Presentation/wwwroot/update.json)
e viene servito da `/update.json`. Per rendere obbligatorio un aggiornamento:

1. pubblica un AAB con il nuovo `versionCode` (per esempio `2`);
2. imposta `latestVersionCode` a `2`;
3. imposta `minSupportedVersionCode` a `2` per bloccare tutte le versioni precedenti;
4. lascia `storeUrl` puntato alla pagina Play Store e pubblica il manifest insieme all'API.

Se vuoi solo segnalare l'aggiornamento senza bloccare l'app, mantieni
`minSupportedVersionCode` uguale al vecchio codice e aumenta solo `latestVersionCode`. Le note multilingua pronte per
Play Console sono in
[`mobile/release-notes.md`](mobile/release-notes.md).

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
- login Google nativo con validazione server-side dell'ID token e cambio account esplicito
- emissione JWT
- ruoli persistenti `Admin`/`Manager` e bootstrap iniziale tramite allowlist email
- gestione ruoli admin tramite `/AdminOps/Roles`

Email:

- invio Resend best-effort di conferma e annullamento prenotazione dopo il commit
- template HTML transazionale e idempotency key per evitare duplicazioni accidentali del provider

Gestione operativa:

- tab Manager per creare, modificare ed eliminare shuttle
- tab Admin per KPI, health check e operazioni amministrative
- endpoint di gestione shuttle protetti dal ruolo `Admin` o `Manager`

## Qualità, test e CI/CD

Comandi locali:

```bash
dotnet test backend/ShuttleBooking.sln
cd mobile
npm run type-check
npm run lint
npm test
```

Pipeline `.github/workflows/ci-cd.yml`:

- test backend automatici
- lint/type-check/test mobile
- build artifact (publish API and archive mobile)
- deploy immagine API su GHCR (branch `main`/`master`)

Report coverage:

- il formato corretto e `coverage.cobertura.xml` (standard Cobertura)
- i file in `backend/ShuttleBooking.Tests/TestResults/` sono output locali e ignorati da Git
