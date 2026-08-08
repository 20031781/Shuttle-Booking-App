import {describe, expect, it} from 'vitest';

import {resolveNotificationNavigationTarget} from './notification-navigation';

describe('resolveNotificationNavigationTarget', () => {
    it('porta alle prenotazioni per conferma e annullamento', () => {
        expect(resolveNotificationNavigationTarget({type: 'booking_confirmed'})).toEqual({tab: 'bookings'});
        expect(resolveNotificationNavigationTarget({type: 'booking_canceled'})).toEqual({tab: 'bookings'});
    });

    it('porta alle corse per promemoria, posti liberati e comunicazioni', () => {
        expect(resolveNotificationNavigationTarget({type: 'shuttle_reminder'})).toEqual({tab: 'shuttle'});
        expect(resolveNotificationNavigationTarget({type: 'seat_available'})).toEqual({tab: 'shuttle'});
        expect(resolveNotificationNavigationTarget({type: 'system_announcement'})).toEqual({tab: 'shuttle'});
    });

    it('porta alla gestione navette per gli aggiornamenti shuttle', () => {
        expect(resolveNotificationNavigationTarget({type: 'shuttle_updated'})).toEqual({tab: 'manager'});
    });

    it('normalizza il tipo ignorando maiuscole e spazi', () => {
        expect(resolveNotificationNavigationTarget({type: '  BOOKING_CONFIRMED  '})).toEqual({tab: 'bookings'});
    });

    it('ripiega sulla home per un tipo sconosciuto o non stringa', () => {
        expect(resolveNotificationNavigationTarget({type: 'qualcosa_di_nuovo'})).toEqual({tab: 'shuttle'});
        expect(resolveNotificationNavigationTarget({type: 42})).toEqual({tab: 'shuttle'});
        expect(resolveNotificationNavigationTarget({})).toEqual({tab: 'shuttle'});
    });

    it('restituisce null quando non c\'è alcun payload', () => {
        expect(resolveNotificationNavigationTarget(null)).toBeNull();
        expect(resolveNotificationNavigationTarget(undefined)).toBeNull();
    });
});
