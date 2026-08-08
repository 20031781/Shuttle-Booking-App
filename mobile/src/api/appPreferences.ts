import * as SecureStore from 'expo-secure-store';

import type {UpdatePreviewMode} from '@/update/UpdateDisplayResolver';

export type NotificationPreferences = {
    bookingConfirmations: boolean;
    bookingCancellations: boolean;
    shuttleReminderOneHour: boolean;
    shuttleReminderDayBefore: boolean;
    seatAvailabilityAlerts: boolean;
    systemAnnouncements: boolean;
};

export type StoredThemePreference = 'system' | 'aurora-glass';

const notificationStorageKey = 'shuttlebooking.app.preferences.v1';
const themeStorageKey = 'shuttlebooking.app.theme.v1';
const updatePreviewStorageKey = 'shuttlebooking.app.updatePreview.v1';
const secureStoreOptions: SecureStore.SecureStoreOptions = {
    keychainService: 'shuttlebooking-session'
};

const defaultNotificationPreferences: NotificationPreferences = {
    bookingConfirmations: true,
    bookingCancellations: true,
    shuttleReminderOneHour: true,
    shuttleReminderDayBefore: false,
    seatAvailabilityAlerts: true,
    systemAnnouncements: true
};

let memoryPreferences: NotificationPreferences | null = null;
let memoryThemePreference: StoredThemePreference | null = null;
let memoryUpdatePreviewMode: UpdatePreviewMode | null = null;

function isValidPreferences(value: unknown): value is NotificationPreferences {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const candidate = value as Record<string, unknown>;
    return typeof candidate.bookingConfirmations === 'boolean'
        && typeof candidate.bookingCancellations === 'boolean'
        && typeof candidate.shuttleReminderOneHour === 'boolean'
        && typeof candidate.shuttleReminderDayBefore === 'boolean'
        && typeof candidate.seatAvailabilityAlerts === 'boolean'
        && typeof candidate.systemAnnouncements === 'boolean';
}

async function readRawValue(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(notificationStorageKey, secureStoreOptions);
    } catch {
        return null;
    }
}

async function saveRawValue(value: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(notificationStorageKey, value, secureStoreOptions);
    } catch {
        // Ignore secure storage failures and keep in-memory fallback.
    }
}

function isValidThemePreference(value: unknown): value is StoredThemePreference {
    return value === 'system' || value === 'aurora-glass';
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
    if (memoryPreferences) {
        return memoryPreferences;
    }

    const rawValue = await readRawValue();
    if (!rawValue) {
        memoryPreferences = defaultNotificationPreferences;
        return memoryPreferences;
    }

    try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (isValidPreferences(parsed)) {
            memoryPreferences = parsed;
            return memoryPreferences;
        }
    } catch {
        // Fallback to default.
    }

    memoryPreferences = defaultNotificationPreferences;
    return memoryPreferences;
}

export async function saveNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    memoryPreferences = preferences;
    await saveRawValue(JSON.stringify(preferences));
}

export async function loadThemePreference(): Promise<StoredThemePreference> {
    if (memoryThemePreference) {
        return memoryThemePreference;
    }

    try {
        const raw = await SecureStore.getItemAsync(themeStorageKey, secureStoreOptions);
        if (isValidThemePreference(raw)) {
            memoryThemePreference = raw;
            return memoryThemePreference;
        }
    } catch {
        // Ignore secure storage failures and fallback to default.
    }

    memoryThemePreference = 'aurora-glass';
    return memoryThemePreference;
}

export async function saveThemePreference(preference: StoredThemePreference): Promise<void> {
    memoryThemePreference = preference;
    try {
        await SecureStore.setItemAsync(themeStorageKey, preference, secureStoreOptions);
    } catch {
        // Ignore secure storage failures and keep in-memory fallback.
    }
}

function isValidUpdatePreviewMode(value: unknown): value is UpdatePreviewMode {
    return value === 'none' || value === 'optional' || value === 'required';
}

export async function loadUpdatePreviewMode(): Promise<UpdatePreviewMode> {
    if (memoryUpdatePreviewMode) {
        return memoryUpdatePreviewMode;
    }

    try {
        const raw = await SecureStore.getItemAsync(updatePreviewStorageKey, secureStoreOptions);
        if (isValidUpdatePreviewMode(raw)) {
            memoryUpdatePreviewMode = raw;
            return memoryUpdatePreviewMode;
        }
    } catch {
        // Ignore secure storage failures and fallback to default.
    }

    memoryUpdatePreviewMode = 'none';
    return memoryUpdatePreviewMode;
}

export async function saveUpdatePreviewMode(mode: UpdatePreviewMode): Promise<void> {
    memoryUpdatePreviewMode = mode;
    try {
        await SecureStore.setItemAsync(updatePreviewStorageKey, mode, secureStoreOptions);
    } catch {
        // Ignore secure storage failures and keep in-memory fallback.
    }
}
