import {beforeEach, describe, expect, it, vi} from 'vitest';

/**
 * Questi test non dichiarano alcun mock di `expo-secure-store`: usano quello
 * globale definito in `vitest.setup.ts`, che espone uno storage in-memory
 * azzerato prima di ogni test.
 */
async function loadModule() {
    vi.resetModules();
    return import('./appPreferences');
}

describe('appPreferences', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('restituisce le preferenze di default quando non c\'è nulla di salvato', async () => {
        const {loadNotificationPreferences} = await loadModule();

        await expect(loadNotificationPreferences()).resolves.toEqual({
            bookingConfirmations: true,
            bookingCancellations: true,
            shuttleReminderOneHour: true,
            shuttleReminderDayBefore: false,
            seatAvailabilityAlerts: true,
            systemAnnouncements: true
        });
    });

    it('rilegge le preferenze salvate da un modulo appena caricato', async () => {
        const first = await loadModule();
        await first.saveNotificationPreferences({
            bookingConfirmations: false,
            bookingCancellations: false,
            shuttleReminderOneHour: false,
            shuttleReminderDayBefore: true,
            seatAvailabilityAlerts: false,
            systemAnnouncements: false
        });

        // Ricarica il modulo per svuotare la cache in memoria e forzare la
        // rilettura dallo storage.
        const second = await loadModule();

        await expect(second.loadNotificationPreferences()).resolves.toMatchObject({
            bookingConfirmations: false,
            shuttleReminderDayBefore: true
        });
    });

    it('ripiega sui default quando il valore salvato è corrotto', async () => {
        const SecureStore = await import('expo-secure-store');
        await SecureStore.setItemAsync('shuttlebooking.app.preferences.v1', 'non-json');

        const {loadNotificationPreferences} = await loadModule();

        await expect(loadNotificationPreferences()).resolves.toMatchObject({bookingConfirmations: true});
    });

    it('usa aurora-glass come tema di default e persiste la scelta', async () => {
        const first = await loadModule();
        await expect(first.loadThemePreference()).resolves.toBe('aurora-glass');

        await first.saveThemePreference('system');
        const second = await loadModule();

        await expect(second.loadThemePreference()).resolves.toBe('system');
    });

    it('persiste le modalità di anteprima degli aggiornamenti', async () => {
        const first = await loadModule();
        await expect(first.loadUpdatePreviewMode()).resolves.toBe('none');

        await first.saveUpdatePreviewMode('required');
        const second = await loadModule();

        await expect(second.loadUpdatePreviewMode()).resolves.toBe('required');
    });
});
