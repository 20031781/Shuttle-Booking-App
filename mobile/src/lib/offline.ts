/**
 * Riconoscimento centralizzato degli errori "il server non è raggiungibile",
 * distinti dagli errori applicativi (400/404/409) che vanno mostrati all'utente.
 */

const NETWORK_PATTERNS = [
    /network error/i,
    /network request failed/i,
    /failed to fetch/i,
    /failed to connect/i,
    /server non raggiungibile/i
];

const NETWORK_ERROR_CODES = ['ECONNABORTED', 'ENOTFOUND', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_CONNECTION_REFUSED'];

// Un backend in restart/dietro un proxy che non risponde restituisce questi status:
// per l'utente è indistinguibile dall'essere offline, quindi lo trattiamo così.
const OFFLINE_FALLBACK_STATUS_CODES = [502, 503, 504];

type ErrorLike = {
    statusCode?: number;
    code?: string;
    message?: string;
    name?: string;
};

function readStatusCode(error: unknown): number | undefined {
    const candidate = error as ErrorLike | null;
    return typeof candidate?.statusCode === 'number' ? candidate.statusCode : undefined;
}

export function isNetworkError(error: unknown): boolean {
    // Il timeout lato client (AbortController) è a tutti gli effetti "non raggiungibile".
    if (error instanceof Error && error.name === 'AbortError') {
        return true;
    }

    // fetch() fallisce con TypeError quando non riesce nemmeno a stabilire la connessione.
    if (error instanceof TypeError) {
        return true;
    }

    const candidate = error as ErrorLike | null;
    const statusCode = readStatusCode(error);
    if (statusCode === 0) {
        return true;
    }

    const code = typeof candidate?.code === 'string' ? candidate.code.toUpperCase() : '';
    if (code && NETWORK_ERROR_CODES.includes(code)) {
        return true;
    }

    const rawMessage = typeof candidate?.message === 'string' ? candidate.message.trim() : '';
    return NETWORK_PATTERNS.some(pattern => pattern.test(rawMessage));
}

export function shouldUseOfflineFallback(error: unknown): boolean {
    if (isNetworkError(error)) {
        return true;
    }

    const statusCode = readStatusCode(error);
    return statusCode !== undefined && OFFLINE_FALLBACK_STATUS_CODES.includes(statusCode);
}

export function buildLocalId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
