import type {NotificationPreferences} from './appPreferences';
import {apiConfig} from './config';
import {putJsonAuth} from './httpClient';

type UpdateNotificationPreferencesPayload = {
    bookingConfirmations: boolean;
    bookingCancellations: boolean;
};

export async function syncNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    if (apiConfig.mockMode) {
        return;
    }

    await putJsonAuth<UpdateNotificationPreferencesPayload, void>('/User/NotificationPreferences', {
        bookingConfirmations: preferences.bookingConfirmations,
        bookingCancellations: preferences.bookingCancellations
    });
}
