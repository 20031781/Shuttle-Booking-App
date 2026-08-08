import {NativeModules, Platform} from 'react-native';

const apiPort = 5000;

function extractHostFromScriptUrl(scriptUrl: string | undefined): string | null {
    if (!scriptUrl) {
        return null;
    }

    const match = scriptUrl.match(/^[a-z]+:\/\/([^/:?#]+)/i);
    if (!match?.[1]) {
        return null;
    }

    return match[1];
}

function isDirectLocalHost(host: string): boolean {
    if (host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2') {
        return true;
    }

    return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function detectDevHost(): string | null {
    if (!__DEV__) {
        return null;
    }

    const sourceCode = NativeModules.SourceCode as { scriptURL?: string } | undefined;
    const host = extractHostFromScriptUrl(sourceCode?.scriptURL);
    if (!host || !isDirectLocalHost(host)) {
        return null;
    }

    return host;
}

function resolveDefaultApiBaseUrl(): string {
    const devHost = detectDevHost();
    if (devHost) {
        return `http://${devHost}:${apiPort}`;
    }

    if (Platform.OS === 'android') {
        return `http://10.0.2.2:${apiPort}`;
    }

    return `http://localhost:${apiPort}`;
}

const defaultApiBaseUrl = resolveDefaultApiBaseUrl();

function normalizeBaseUrl(rawBaseUrl: string): string {
    return rawBaseUrl.replace(/\/+$/, '');
}

/**
 * Una variabile assente o vuota vale `undefined`, non stringa vuota: così
 * "non configurato" è un solo valore e i fallback possono usare `??`.
 */
function readOptionalEnv(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    if (!normalized) {
        return undefined;
    }

    return normalized;
}

export const apiConfig = {
    baseUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL ?? defaultApiBaseUrl),
    googleExpoClientId: readOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO),
    googleAndroidClientId: readOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID),
    googleIosClientId: readOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS),
    googleWebClientId: readOptionalEnv(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB),
    mockMode: process.env.EXPO_PUBLIC_MOCK_MODE === 'true'
};
