import {beforeEach, describe, expect, it, vi} from 'vitest';

const putJsonAuthMock = vi.fn();
const apiConfigMock = {mockMode: false};

vi.mock('./httpClient', () => ({
    putJsonAuth: putJsonAuthMock
}));

vi.mock('./config', () => ({
    apiConfig: apiConfigMock
}));

describe('syncNotificationPreferences', () => {
    beforeEach(() => {
        putJsonAuthMock.mockReset();
        apiConfigMock.mockMode = false;
    });

    it('non chiama il backend in modalità mock', async () => {
        apiConfigMock.mockMode = true;

        const {syncNotificationPreferences} = await import('./notificationPreferencesRepository');
        await syncNotificationPreferences({
            bookingConfirmations: false,
            bookingCancellations: true,
            shuttleReminderOneHour: true,
            shuttleReminderDayBefore: false,
            seatAvailabilityAlerts: true,
            systemAnnouncements: true
        });

        expect(putJsonAuthMock).not.toHaveBeenCalled();
    });

    it('invia al backend solo le preferenze supportate dall API', async () => {
        const {syncNotificationPreferences} = await import('./notificationPreferencesRepository');
        await syncNotificationPreferences({
            bookingConfirmations: false,
            bookingCancellations: true,
            shuttleReminderOneHour: false,
            shuttleReminderDayBefore: true,
            seatAvailabilityAlerts: false,
            systemAnnouncements: false
        });

        expect(putJsonAuthMock).toHaveBeenCalledWith('/User/NotificationPreferences', {
            bookingConfirmations: false,
            bookingCancellations: true
        });
    });
});
