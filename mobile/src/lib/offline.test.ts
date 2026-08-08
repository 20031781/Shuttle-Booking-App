import {describe, expect, it} from 'vitest';

import {buildLocalId, isNetworkError, shouldUseOfflineFallback} from './offline';

describe('isNetworkError', () => {
    it('riconosce il timeout lato client (AbortError)', () => {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';

        expect(isNetworkError(abortError)).toBe(true);
    });

    it('riconosce il fallimento di fetch (TypeError)', () => {
        expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
    });

    it('riconosce i codici di errore di trasporto', () => {
        expect(isNetworkError({code: 'ECONNABORTED'})).toBe(true);
        expect(isNetworkError({code: 'err_network'})).toBe(true);
    });

    it('riconosce i messaggi di rete tipici', () => {
        expect(isNetworkError({message: 'Network request failed'})).toBe(true);
        expect(isNetworkError({message: 'Server non raggiungibile (http://x)'})).toBe(true);
    });

    it('non considera errore di rete un errore applicativo', () => {
        expect(isNetworkError({statusCode: 404, message: 'Shuttle non trovato.'})).toBe(false);
        expect(isNetworkError({statusCode: 409, message: 'Posti esauriti.'})).toBe(false);
    });
});

describe('shouldUseOfflineFallback', () => {
    it('tratta 502/503/504 come backend irraggiungibile', () => {
        expect(shouldUseOfflineFallback({statusCode: 502})).toBe(true);
        expect(shouldUseOfflineFallback({statusCode: 503})).toBe(true);
        expect(shouldUseOfflineFallback({statusCode: 504})).toBe(true);
    });

    it('non applica il fallback su errori applicativi', () => {
        expect(shouldUseOfflineFallback({statusCode: 400})).toBe(false);
        expect(shouldUseOfflineFallback({statusCode: 404})).toBe(false);
        expect(shouldUseOfflineFallback({statusCode: 500})).toBe(false);
    });

    it('include comunque tutti gli errori di rete', () => {
        expect(shouldUseOfflineFallback(new TypeError('Failed to fetch'))).toBe(true);
    });
});

describe('buildLocalId', () => {
    it('genera id univoci col prefisso richiesto', () => {
        const first = buildLocalId('booking');
        const second = buildLocalId('booking');

        expect(first.startsWith('booking-')).toBe(true);
        expect(first).not.toBe(second);
    });
});
