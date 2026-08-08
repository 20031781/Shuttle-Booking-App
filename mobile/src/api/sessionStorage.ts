import * as SecureStore from 'expo-secure-store';

import type {UserProfile} from '@/types/domain';

const secureStoreOptions: SecureStore.SecureStoreOptions = {
    keychainService: 'shuttlebooking-session'
};

const sessionTokensKey = 'shuttlebooking.session.tokens.v1';
const sessionUserKey = 'shuttlebooking.session.user.v1';

export type StoredSessionTokens = {
    accessToken: string;
    accessTokenExpiration: string;
    refreshToken: string;
    refreshTokenExpiration: string;
};

const memoryFallback = new Map<string, string>();

type BrowserStorage = {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
};

function getWebStorage(): BrowserStorage | null {
    const candidate = (globalThis as { localStorage?: BrowserStorage }).localStorage;
    if (!candidate) {
        return null;
    }

    return candidate;
}

async function saveRawValue(key: string, value: string): Promise<void> {
    memoryFallback.set(key, value);

    try {
        await SecureStore.setItemAsync(key, value, secureStoreOptions);
        
    } catch {
        const webStorage = getWebStorage();
        webStorage?.setItem(key, value);
    }
}

async function readRawValue(key: string): Promise<string | null> {
    try {
        const secureValue = await SecureStore.getItemAsync(key, secureStoreOptions);
        if (secureValue != null) {
            memoryFallback.set(key, secureValue);
            return secureValue;
        }
    } catch {
        // Fallback handled below.
    }

    const webStorageValue = getWebStorage()?.getItem(key);
    if (webStorageValue != null) {
        memoryFallback.set(key, webStorageValue);
        return webStorageValue;
    }

    return memoryFallback.get(key) ?? null;
}

async function removeRawValue(key: string): Promise<void> {
    memoryFallback.delete(key);

    try {
        await SecureStore.deleteItemAsync(key, secureStoreOptions);
    } catch {
        // Ignore and try web fallback.
    }

    getWebStorage()?.removeItem(key);
}

async function readJsonValue<T>(key: string): Promise<T | null> {
    const rawValue = await readRawValue(key);
    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue) as T;
    } catch {
        await removeRawValue(key);
        return null;
    }
}

async function saveJsonValue<T>(key: string, value: T): Promise<void> {
    await saveRawValue(key, JSON.stringify(value));
}

export async function loadStoredSessionTokens(): Promise<StoredSessionTokens | null> {
    return readJsonValue<StoredSessionTokens>(sessionTokensKey);
}

export async function saveStoredSessionTokens(tokens: StoredSessionTokens): Promise<void> {
    await saveJsonValue(sessionTokensKey, tokens);
}

export async function clearStoredSessionTokens(): Promise<void> {
    await removeRawValue(sessionTokensKey);
}

export async function loadStoredSessionUser(): Promise<UserProfile | null> {
    return readJsonValue<UserProfile>(sessionUserKey);
}

export async function saveStoredSessionUser(user: UserProfile): Promise<void> {
    await saveJsonValue(sessionUserKey, user);
}

export async function clearStoredSessionUser(): Promise<void> {
    await removeRawValue(sessionUserKey);
}
