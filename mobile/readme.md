# Shuttle Booking Mobile (Expo)

App mobile migrata da .NET MAUI a **React Native + Expo Go**.

## Stack

- Expo SDK 52
- React Native 0.76
- TypeScript strict

## Struttura

```
mobile/
├── App.tsx
├── app.json
├── src/
│   ├── api/                # Repository pattern (interfacce + implementazioni)
│   ├── components/         # Componenti UI riutilizzabili
│   ├── features/
│   │   ├── navigation/     # Navigazione applicativa semplificata
│   │   ├── profile/        # Schermata profilo
│   │   └── shuttles/       # Schermata lista shuttle
│   ├── theme/              # Tema colori
│   └── types/              # Tipi dominio
└── package.json
```

## Avvio

```bash
cd mobile
npm install
npm run start
```

Per Expo Go:
1. Apri Expo Go su dispositivo.
2. Scansiona il QR code mostrato da `npm run start`.


## Configurazione API

Di default il client mobile usa l'API reale:

- `EXPO_PUBLIC_API_BASE_URL` (default `http://localhost:5256`)
- `EXPO_PUBLIC_PROFILE_EMAIL` (default `demo@shuttlebooking.app`)
- `EXPO_PUBLIC_MOCK_MODE=true` per forzare repository statici solo in demo/test

Esempio:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5256 \
EXPO_PUBLIC_PROFILE_EMAIL=utente@azienda.it \
npm run start
```

## Qualità codice

```bash
npm run lint
npm run type-check
```

## Note migrazione

- Rimossi i progetti MAUI (`.sln`, `.csproj`, XAML, ViewModel C#).
- Consolidata la UI in componenti React Native semplici, senza duplicazioni.
- Introdotto repository pattern per preparare l'integrazione futura con backend reale.
