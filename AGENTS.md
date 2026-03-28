# AGENTS.md

Guida rapida per future task su questo repository.

## Stack e struttura

- Monorepo con:
- `backend/` ASP.NET Core + EF Core (.NET 10)
- `mobile/` Expo React Native (SDK 54)

## Comandi utili

- Backend API:
- `cd backend`
- `docker compose up -d db`
- `dotnet run --project ShuttleBooking.Presentation --launch-profile http`

- Migrazioni EF:
-
`dotnet ef database update --project backend/ShuttleBooking.Data --startup-project backend/ShuttleBooking.Presentation`

- Mobile:
- `cd mobile`
- `npm install`
- `npm run start`
- `npm run type-check`
- `npm run lint`

## Docker/DB (importante)

- Il DB del progetto `backend` espone la porta host `14330` (`14330:1433`).
- Questo serve per convivere con altri SQL Server locali (es. compose `shuttlebookingapi` su `1433`).
- Connection string locale backend: `Server=localhost,14330;...`.

## Convenzioni backend

- Target framework: `.NET 10`.
- Le migrazioni sono in `backend/ShuttleBooking.Data/Migrations`.
- Se `dotnet build` fallisce per file lock su `ShuttleBooking.Presentation.dll`, chiudere il processo API già in
  esecuzione e riprovare.
- Nota: il `Dockerfile` API usa immagine .NET 8 e non è compatibile con target .NET 10 senza aggiornamento.

## Convenzioni mobile/UI

- Non rimuovere lo skeleton loader (`src/components/SkeletonBlock.tsx`).
- Centralizzare i colori in `src/theme/colors.ts`.
- Evitare colori hardcoded nei componenti/schermate.
- Usare gli stili condivisi in `src/theme/globalStyles.ts` per card e button.
- Navigazione attuale: custom bottom tab in `src/features/navigation/AppNavigator.tsx` (non React Navigation).
- Testi UI in `src/i18n/it.ts`.
- Icone tab: `@expo/vector-icons`.

## Criteri di qualità

- Dopo modifiche mobile: eseguire sempre `npm run type-check` e `npm run lint`.
- Dopo modifiche backend DB: verificare endpoint base (`GET /Shuttles/GetShuttles`) su `http://localhost:5000`.
- Non toccare file/feature non correlate alla task.
