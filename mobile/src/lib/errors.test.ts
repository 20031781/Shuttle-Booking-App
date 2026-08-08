import {describe, expect, it, vi} from 'vitest';

vi.mock('@/api/config', () => ({
    apiConfig: {baseUrl: 'http://localhost:5000'}
}));

class FakeReloginRequiredError extends Error {
    readonly code = 'RELOGIN_REQUIRED';
}

vi.mock('@/api/authSession', () => ({
    isReloginRequiredError: (error: unknown) => error instanceof FakeReloginRequiredError
}));

const {extractErrorMessage, getFriendlyErrorMessage, getStatusCode} = await import('./errors');

describe('getFriendlyErrorMessage', () => {
    it('usa il messaggio dedicato per la sessione scaduta', () => {
        const message = getFriendlyErrorMessage(new FakeReloginRequiredError('Sessione scaduta.'), 'fallback');

        expect(message).toBe('Sessione scaduta.');
    });

    it('usa il messaggio di rete per gli errori di trasporto', () => {
        const message = getFriendlyErrorMessage(new TypeError('Failed to fetch'), 'fallback');

        expect(message).toMatch(/Server non raggiungibile/);
    });

    it('tratta un 503 come server non raggiungibile', () => {
        const message = getFriendlyErrorMessage({statusCode: 503, message: 'Bad Gateway'}, 'fallback');

        expect(message).toMatch(/Server non raggiungibile/);
    });

    it('preferisce il messaggio del backend per gli errori applicativi', () => {
        const message = getFriendlyErrorMessage({statusCode: 409, message: 'Posti esauriti.'}, 'fallback');

        expect(message).toBe('Posti esauriti.');
    });

    it('ripiega sul fallback quando non c\'è nessun messaggio utile', () => {
        expect(getFriendlyErrorMessage({}, 'fallback')).toBe('fallback');
        expect(getFriendlyErrorMessage(null, 'fallback')).toBe('fallback');
    });
});

describe('extractErrorMessage', () => {
    it('estrae il messaggio da Error e da oggetti simili', () => {
        expect(extractErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
        expect(extractErrorMessage({message: 'boom'}, 'fallback')).toBe('boom');
        expect(extractErrorMessage(new Error(''), 'fallback')).toBe('fallback');
        expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
    });
});

describe('getStatusCode', () => {
    it('restituisce lo status quando presente, altrimenti null', () => {
        expect(getStatusCode({statusCode: 404})).toBe(404);
        expect(getStatusCode(new Error('boom'))).toBeNull();
    });
});
