import {apiConfig} from './config';

export type ApiReachabilitySource = 'unknown' | 'healthcheck' | 'response' | 'error';

export type ApiStatusSnapshot = {
    isApiReachable: boolean | null;
    source: ApiReachabilitySource;
    lastUpdatedAt: number | null;
};

type ApiStatusListener = (snapshot: ApiStatusSnapshot) => void;

// L'healthcheck deve dire "su o giù" in fretta: non ha senso aspettare il timeout
// pieno di una richiesta normale solo per scoprire che il server non risponde.
const healthCheckTimeoutMs = 4_000;

const initialSnapshot: ApiStatusSnapshot = {
    isApiReachable: null,
    source: 'unknown',
    lastUpdatedAt: null
};

let snapshot: ApiStatusSnapshot = {...initialSnapshot};
let pendingHealthCheck: Promise<boolean> | null = null;

const listeners = new Set<ApiStatusListener>();

export function getApiStatusSnapshot(): ApiStatusSnapshot {
    return snapshot;
}

export function subscribeToApiStatus(listener: ApiStatusListener): () => void {
    listeners.add(listener);
    listener(snapshot);

    return () => listeners.delete(listener);
}

export function setApiReachable(value: boolean | null, source: ApiReachabilitySource = 'unknown'): void {
    if (snapshot.isApiReachable === value && snapshot.source === source) {
        return;
    }

    snapshot = {
        isApiReachable: value,
        source,
        lastUpdatedAt: Date.now()
    };
    listeners.forEach(listener => listener(snapshot));
}

/**
 * Verifica che il backend risponda. Non ci interessa *cosa* risponde: anche un 404
 * dimostra che il server è vivo e raggiungibile. Solo un errore di trasporto
 * (connessione rifiutata, DNS, timeout) significa davvero "irraggiungibile".
 */
export async function checkApiReachability(force = false): Promise<boolean> {
    if (!force && pendingHealthCheck) {
        return pendingHealthCheck;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), healthCheckTimeoutMs);

    const task = fetch(apiConfig.baseUrl, {method: 'GET', signal: controller.signal})
        .then(() => {
            setApiReachable(true, 'healthcheck');
            return true;
        })
        .catch(() => {
            setApiReachable(false, 'healthcheck');
            return false;
        })
        .finally(() => {
            clearTimeout(timeout);
            if (pendingHealthCheck === task) {
                pendingHealthCheck = null;
            }
        });

    pendingHealthCheck = task;
    return task;
}

export function __resetApiStatusForTests(): void {
    snapshot = {...initialSnapshot};
    pendingHealthCheck = null;
    listeners.clear();
}
