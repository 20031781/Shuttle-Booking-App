export const it = {
  app: {
    sections: {
      shuttle: 'Shuttle',
      bookings: 'Prenotazioni',
      profile: 'Profilo'
    }
  },
  shuttles: {
    title: 'Shuttle',
    subtitle: 'Corse disponibili oggi · aggiornamento automatico',
    loadErrorTitle: 'Impossibile caricare le corse',
    loadErrorMessage: 'Errore nel caricamento degli shuttle.',
    bookingErrorMessage: 'Errore durante la prenotazione.',
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
    title: 'Prenotazioni',
    subtitle: 'Storico utente',
    historyLoadErrorTitle: 'Impossibile caricare lo storico',
    historyLoadErrorMessage: 'Errore nel caricamento dello storico.',
    cancelErrorMessage: 'Errore durante l’annullamento.',
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
    title: 'Profilo',
    subtitle: 'Dati utente',
    loadErrorTitle: 'Impossibile caricare il profilo',
    loadErrorMessage: 'Errore nel caricamento del profilo.',
    unavailable: 'Profilo non disponibile.',
    retry: 'Riprova',
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
    requestTimeout: 'La richiesta al server ha superato il tempo massimo di attesa.'
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
