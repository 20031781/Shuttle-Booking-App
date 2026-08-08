import {isReloginRequiredError} from '@/api/authSession';
import {apiConfig} from '@/api/config';
import {t} from '@/i18n';
import {isNetworkError, shouldUseOfflineFallback} from './offline';

type ErrorLike = {
    message?: string;
    statusCode?: number;
};

/** Estrae in sicurezza un `.message` stringa da un valore lanciato qualsiasi. */
export function extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) {
        return error.message || fallback;
    }

    const candidate = error as ErrorLike | null;
    if (typeof candidate?.message === 'string' && candidate.message.length > 0) {
        return candidate.message;
    }

    return fallback;
}

/**
 * Traduce un errore qualsiasi nel messaggio da mostrare all'utente.
 *
 * Gli errori di rete e di sessione hanno un messaggio dedicato perché l'utente può
 * agire (riconnettersi, rifare login); per tutto il resto si usa il messaggio del
 * backend se c'è — è già in italiano e più preciso del fallback generico.
 */
export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
    if (isReloginRequiredError(error)) {
        return error.message || t.auth.reloginRequired;
    }

    if (isNetworkError(error) || shouldUseOfflineFallback(error)) {
        return t.api.networkUnavailable(apiConfig.baseUrl);
    }

    return extractErrorMessage(error, fallback);
}

export function getStatusCode(error: unknown): number | null {
    const candidate = error as ErrorLike | null;
    return typeof candidate?.statusCode === 'number' ? candidate.statusCode : null;
}
