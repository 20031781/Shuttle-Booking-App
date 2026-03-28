export const it = {
    app: {
        sections: {
            shuttle: 'Shuttle',
            bookings: 'Prenotazioni',
            admin: 'Admin',
            profile: 'Profilo'
        }
    },
    auth: {
        badge: 'Accesso',
        title: 'Accedi a Shuttle Booking',
        subtitle: 'Login classico oppure Google.',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        emailPlaceholder: 'nome@azienda.it',
        passwordPlaceholder: 'Password',
        missingFields: 'Inserisci email e password.',
        signIn: 'Accedi',
        signUp: 'Crea account',
        switchToSignUp: 'Non hai un account? Registrati',
        switchToSignIn: 'Hai già un account? Accedi',
        inProgress: 'Operazione in corso...',
        googleButton: 'Continua con Google',
        googleConfigMissing:
            'Configurazione Google OAuth mancante. Su Android imposta EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID (oppure EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO).',
        googleUnavailable: 'Login Google non disponibile al momento.',
        emailRequiredForGoogle: 'Inserisci prima la tua email per il login Google.',
        googleTokenMissingInResponse: 'Google non ha restituito un token id valido.',
        googleLoginFailed: 'Login Google non riuscito.',
        loginFailed: 'Login non riuscito.'
    },
    updates: {
        requiredTitle: 'Aggiornamento richiesto',
        requiredBody: 'Per continuare a usare l’app è necessario aggiornare alla versione più recente.',
        optionalMessage: 'È disponibile un aggiornamento.',
        updateNow: 'Aggiorna ora',
        missingUpdateTarget:
            'Target di aggiornamento non configurato. Inserisci updateUrl/storeUrl/apkUrl in update.json.'
    },
    admin: {
        badge: 'Operazioni',
        title: 'Dashboard Admin',
        subtitle: 'KPI e stato sistema in tempo reale',
        operationsTitle: 'Operatività giornaliera',
        healthTitle: 'Stato servizi',
        shuttleLoadTitle: 'Carico shuttle',
        loadErrorTitle: 'Impossibile caricare la dashboard admin',
        loadErrorMessage: 'Errore nel caricamento dei dati admin.',
        retry: 'Riprova',
        empty: 'Nessun dato admin disponibile.',
        emptyShuttles: 'Nessuno shuttle disponibile.',
        generatedAtLabel: 'Aggiornato alle',
        checkedAtLabel: 'Health check alle',
        metrics: {
            totalUsers: 'Utenti',
            totalShuttles: 'Shuttle',
            activeBookings: 'Prenotazioni attive',
            occupancy: 'Occupazione',
            bookingsCreated: 'Prenotazioni create',
            canceledBookings: 'Prenotazioni annullate',
            cancellationRate: 'Tasso annullamento',
            seatsAvailable: 'Posti liberi',
            overallStatus: 'Stato generale'
        },
        status: {
            healthy: 'Sano',
            degraded: 'Degradato',
            unhealthy: 'Critico',
            disabled: 'Disabilitato'
        }
    },
    shuttles: {
        badge: 'Operativo',
        title: 'Shuttle',
        subtitle: 'Corse disponibili oggi · aggiornamento automatico',
        summaryRoutes: 'Corse',
        summarySeats: 'Posti totali',
        summaryLowAvailability: 'In esaurimento',
        loadErrorTitle: 'Impossibile caricare le corse',
        loadErrorMessage: 'Errore nel caricamento degli shuttle.',
        bookingErrorMessage: 'Errore durante la prenotazione.',
        emptyTitle: 'Nessuna corsa trovata',
        empty: 'Nessuna corsa disponibile.',
        retry: 'Riprova',
        book: 'Prenota',
        full: 'Completo',
        bookingInProgress: 'Prenotazione...',
        departureLabel: 'Partenza',
        seatsLabel: 'Posti disponibili',
        bookingConfirmed: (routeName: string, seatsRemaining: number) =>
            `Prenotazione confermata per ${routeName}. Posti residui: ${seatsRemaining}.`
    },
    bookings: {
        badge: 'Storico',
        title: 'Prenotazioni',
        subtitle: 'Storico utente',
        summaryActive: 'Attive',
        summaryCanceled: 'Annullate',
        historyLoadErrorTitle: 'Impossibile caricare lo storico',
        historyLoadErrorMessage: 'Errore nel caricamento dello storico.',
        cancelErrorMessage: 'Errore durante l’annullamento.',
        emptyTitle: 'Storico vuoto',
        empty: 'Nessuna prenotazione presente.',
        retry: 'Riprova',
        cancel: 'Annulla',
        canceling: 'Annullamento...',
        statusLabel: 'Stato',
        dateLabel: 'Data',
        statusActive: 'Attiva',
        statusCanceled: 'Annullata',
        bookingNotFound: 'Prenotazione non trovata.',
        shuttleFallbackName: 'Shuttle'
    },
    profile: {
        badge: 'Account',
        title: 'Profilo',
        subtitle: 'Dati utente',
        loadErrorTitle: 'Impossibile caricare il profilo',
        loadErrorMessage: 'Errore nel caricamento del profilo.',
        unavailable: 'Profilo non disponibile.',
        retry: 'Riprova',
        logout: 'Logout',
        loggingOut: 'Logout...',
        labels: {
            fullName: 'Nome',
            email: 'Email',
            company: 'Azienda'
        },
        fallback: {
            fullName: 'Utente Demo',
            email: 'demo@shuttlebooking.app',
            company: 'Shuttle Booking'
        }
    },
    api: {
        requestFailed: (statusCode: number) => `Richiesta fallita: ${statusCode}`,
        requestTimeout: 'La richiesta al server ha superato il tempo massimo di attesa.',
        authRequired: 'Sessione non autenticata. Effettua il login per continuare.',
        networkUnavailable: (baseUrl: string) =>
            `Server non raggiungibile (${baseUrl}). Verifica URL API e rete: su Android emulatore usa 10.0.2.2, su device usa l'IP LAN del tuo PC.`
    },
    mock: {
        shuttleNames: {
            toAirport: 'Sede → Aeroporto',
            fromAirport: 'Aeroporto → Sede',
            toCenter: 'Sede → Centro città'
        },
        departureUnknown: '--:--',
        user: {
            lastName: 'App',
            city: 'Roma',
            firstNameFallback: 'Utente'
        }
    }
} as const;
