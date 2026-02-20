# ShuttleBookingApp

![Static Badge](https://img.shields.io/badge/C%23-12.0-512bd4)
![Static Badge](https://img.shields.io/badge/.NET-10.0-rebeccapurple)

TARGET ANDROID 8 (OREO)

**Versione corrente pubblicata**: [0.0](#versioni)

---

Questo è il README principale della soluzione.

## Tempi di lavoro

Per curiosità, sono registrati i tempi per la realizzazione di questo progetto attraverso `Time Traking`.

## Design

### Colori

Colori presi dalla collezione proposta
da [Flutter](https://api.flutter.dev/flutter/cupertino/CupertinoColors-class.html).
Tradotti in **hex** usando [rgb to hex](https://www.rgbtohex.net/).

#### Colori compatibili

Grazie al sito web [mycolor.space](https://mycolor.space/?hex=%23845EC2&sub=1) si possono individuare i colori
compatibili con un colore scelto.

Altra opzione: [coolors.co](https://coolors.co/).

Video utile: [Andrea Tempestini - Come creare illustrazioni per la tua app o sito web](https://youtu.be/oowhzILaXTM).

### Icone

Le icone sono prese da [flaticon](https://www.flaticon.com/).

## Struttura del progetto

Non è aggiornata.

```
ShuttleBookingApp.Presentation/
│
├── App.xaml                  # File principale dell'app (definizione delle risorse globali)
├── App.xaml.cs               # Codice dietro per l'app (inizializzazione e gestione della vita dell'app)
│
├── AppShell.xaml             # File XAML per la Shell dell'app (navigazione principale)
├── AppShell.xaml.cs          # Codice dietro per AppShell (gestione della navigazione)
│
├── MainPage.xaml             # Pagina principale dell'app
├── MainPage.xaml.cs          # Codice dietro per MainPage (logica della pagina)
│
├── MauiProgram.cs            # Punto di ingresso per configurare l'app MAUI (registrazione servizi, ecc.)
│
├── Properties/               # Cartella per le proprietà dell'app
│   └── launchSettings.json    # Configurazione per il lancio dell'app
│
├── Platform/                 # Cartella per file specifici della piattaforma
│   ├── Android/              # File e configurazioni per Android
│   ├── iOS/                  # File e configurazioni per iOS
│   ├── MacCatalyst/          # File e configurazioni per Mac
│   ├── Tizen/                # File e configurazioni per Tizen
│   └── Windows/              # File e configurazioni per Windows
│
└── Resources/                # Risorse condivise dell'app
├── Appicon/              # Icone dell'app
├── Fonts/                # Font personalizzati utilizzati nell'app
├── Images/               # Immagini utilizzate nell'app
├── Raw/                  # Risorse raw (audio, video, ecc.)
├── Splash/               # Risorse per la schermata di avvio
└── Styles/               # Stili globali utilizzati nell'app (definizione dei temi, controlli, ecc.)
```

### Dettaglio delle Cartelle e File

1. `App.xaml` e `App.xaml.cs`:
    - Questi file definiscono le risorse globali dell'app e gestiscono l'inizializzazione dell'app. Puoi dichiarare
      stili, colori e altri asset globali qui.
2. `AppShell.xaml` e `AppShell.xaml.cs`:
    - Utilizzati per configurare la navigazione dell'app utilizzando la Shell di MAUI. Puoi definire la struttura di
      navigazione (come le pagine principali e il menu) in `AppShell.xaml` e gestire la logica in `AppShell.xaml.cs`.
3. `MainPage.xaml` e `MainPage.xaml.cs`:
    - Rappresentano la pagina principale della tua applicazione. `MainPage.xaml` contiene il layout e gli elementi UI,
      mentre `MainPage.xaml.cs` contiene la logica associata a questa pagina.
4. `MauiProgram.cs`:
    - È il punto di ingresso dell'app MAUI. Qui registri i servizi, i ViewModel e qualsiasi altro componente necessario.
      È un luogo importante per configurare la Dependency Injection.
5. `Properties/`:
    - Contiene file di configurazione come `launchSettings.json`, che gestisce le impostazioni di avvio per l'app, utili
      durante il debug.
6. `Platform/`:
    - Questa cartella contiene file specifici per ciascuna piattaforma (Android, iOS, MacCatalyst, Tizen, Windows). Qui
      puoi gestire la logica e le configurazioni specifiche per ogni piattaforma, ad esempio, implementazioni native o
      impostazioni di configurazione.
7. `Resources/`:
    - Contiene tutte le risorse condivise dalla tua applicazione:
    - `Appicon`/: Contiene le icone dell'app.
    - `Fonts`/: Font personalizzati da utilizzare nel tuo progetto.
    - `Images`/: Immagini necessarie per la tua UI.
    - `Raw`/: Risorse non elaborate, come audio o video.
    - `Splash`/: Risorse per la schermata di avvio dell'app.
    - `Styles`/: File XAML che definiscono gli stili globali per i controlli, facilitando un design coerente nell'intera
      applicazione.

## Login

Comando per ottenere la SHA-1

```powershell
`keytool -list -v -keystore "C:\Users\appet\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android`
```

ID client = _1069872727435-97cdhrbeeomt8sclk139trvfbmnu6604.apps.googleusercontent.com_

## Versioni

### 26/10/2024 v: 1.1

- Implementata grafica per metodi CRUD sugli [Shuttle](ShuttleBookingApp.Business/Models/Shuttle.cs)

### 09/10/2024 v: 1.0

- Creata la soluzione, il progetto principale `ShuttleBookingApp.Presentation` e il progetto
  `ShuttleBookingApp.Business`
- Creata l'entità [Shuttle](ShuttleBookingApp.Business/Models/Shuttle.cs)
- Creata una vista Home e una vista ShuttleList
- Impostato l'IP verso le API che cambia se in base all'esecuzione dell'app (emulazione o su cellulare)