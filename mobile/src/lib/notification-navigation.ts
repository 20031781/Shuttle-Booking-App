import type {AppSection} from '@/features/navigation/routes';

/**
 * Mappa il payload di una notifica push alla destinazione di navigazione.
 *
 * Il backend invia i dati nel `data` del messaggio FCM: qui li normalizziamo
 * (accettando sia snake_case che camelCase) e decidiamo dove portare l'utente.
 * È volutamente una funzione pura, così è testabile senza montare la navigazione.
 *
 * NOTA: i target sono limitati alle sezioni che esistono davvero nell'app.
 */
export type NotificationNavigationTarget = {
    tab: AppSection;
};

function readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function resolveNotificationNavigationTarget(
    data: Record<string, unknown> | undefined | null
): NotificationNavigationTarget | null {
    if (!data) {
        return null;
    }

    switch (readString(data.type)?.toLowerCase()) {
        case 'booking_confirmed':
        case 'booking_canceled':
            return {tab: 'bookings'};
        case 'shuttle_reminder':
        case 'seat_available':
        case 'system_announcement':
            return {tab: 'shuttle'};
        case 'shuttle_updated':
            return {tab: 'manager'};
        default:
            // Notifica sconosciuta (es. da una versione più recente del backend):
            // meglio aprire la home che non fare nulla.
            return {tab: 'shuttle'};
    }
}
