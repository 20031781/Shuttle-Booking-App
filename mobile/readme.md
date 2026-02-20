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

## Qualità codice

```bash
npm run lint
npm run type-check
```

## Note migrazione

- Rimossi i progetti MAUI (`.sln`, `.csproj`, XAML, ViewModel C#).
- Consolidata la UI in componenti React Native semplici, senza duplicazioni.
- Introdotto repository pattern per preparare l'integrazione futura con backend reale.
