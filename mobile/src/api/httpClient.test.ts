import {beforeEach, describe, expect, it, vi} from 'vitest';

const authSessionMocks = vi.hoisted(() => {
    class FakeReloginRequiredError extends Error {
        readonly code = 'RELOGIN_REQUIRED';
    }

    return {
        FakeReloginRequiredError,
        getAccessToken: vi.fn(async () => 'initial-token'),
        refreshAccessToken: vi.fn(async () => ({
            accessToken: 'refreshed-token',
            accessTokenExpiration: new Date(Date.now() + 60_000).toISOString(),
            refreshToken: 'refreshed-refresh-token',
            refreshTokenExpiration: new Date(Date.now() + 60_000).toISOString()
        })),
        invalidateSessionForRelogin: vi.fn(async () => new FakeReloginRequiredError('Sessione scaduta.'))
    };
});

vi.mock('./config', () => ({
    apiConfig: {
        baseUrl: 'http://localhost:5000'
    }
}));

vi.mock('./authSession', () => ({
    getAccessToken: authSessionMocks.getAccessToken,
    refreshAccessToken: authSessionMocks.refreshAccessToken,
    invalidateSessionForRelogin: authSessionMocks.invalidateSessionForRelogin,
    isReloginRequiredError: (error: unknown) => error instanceof authSessionMocks.FakeReloginRequiredError
}));

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {'Content-Type': 'application/json'}
    });
}

describe('httpClient requestJson', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        authSessionMocks.getAccessToken.mockClear();
        authSessionMocks.refreshAccessToken.mockClear();
        authSessionMocks.invalidateSessionForRelogin.mockClear();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('effettua una GET autenticata allegando il bearer token', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({value: 42}));

        const {getJsonAuth} = await import('./httpClient');
        const result = await getJsonAuth<{value: number}>('/Shuttles/GetShuttles');

        expect(result).toEqual({value: 42});
        const [, init] = fetchMock.mock.calls[0]!;
        expect((init!.headers as Headers).get('Authorization')).toBe('Bearer initial-token');
    });

    it('su 401 esegue refresh e ritenta con il nuovo token', async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(null, {status: 401}))
            .mockResolvedValueOnce(jsonResponse({value: 1}));

        const {getJsonAuth} = await import('./httpClient');
        const result = await getJsonAuth<{value: number}>('/User/Me');

        expect(result).toEqual({value: 1});
        expect(authSessionMocks.refreshAccessToken).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const [, retriedInit] = fetchMock.mock.calls[1]!;
        expect((retriedInit!.headers as Headers).get('Authorization')).toBe('Bearer refreshed-token');
    });

    it('su doppio 401 invalida la sessione e propaga errore di relogin', async () => {
        fetchMock
            .mockResolvedValueOnce(new Response(null, {status: 401}))
            .mockResolvedValueOnce(new Response(null, {status: 401}));

        const {getJsonAuth} = await import('./httpClient');

        await expect(getJsonAuth('/User/Me')).rejects.toThrow('Sessione scaduta.');
        expect(authSessionMocks.invalidateSessionForRelogin).toHaveBeenCalledTimes(1);
    });

    it('mappa un errore diverso da 401/network in HttpError con messaggio dal body', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({message: 'Shuttle non trovato.'}, 404));

        const {getJsonAuth} = await import('./httpClient');

        await expect(getJsonAuth('/Shuttles/GetShuttle/999')).rejects.toMatchObject({
            statusCode: 404,
            message: 'Shuttle non trovato.'
        });
    });

    it('mappa un errore di rete in messaggio non tecnico', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        const {getJson} = await import('./httpClient');

        await expect(getJson('/Shuttles/GetShuttles')).rejects.toThrow(/Server non raggiungibile/);
    });

    it('rifiuta una risposta che non rispetta lo schema zod', async () => {
        const {z} = await import('zod');
        // Il backend risponde 200 ma con `capacity` come stringa invece che numero.
        fetchMock.mockResolvedValueOnce(jsonResponse([{id: 1, name: 'Navetta', capacity: '10'}]));

        const {getJson, InvalidApiResponseError} = await import('./httpClient');
        const schema = z.array(z.object({id: z.number(), name: z.string(), capacity: z.number()}));

        await expect(getJson('/Shuttles/GetShuttles', {schema})).rejects.toBeInstanceOf(InvalidApiResponseError);
    });

    it('accetta una risposta conforme allo schema zod restituendo il valore tipizzato', async () => {
        const {z} = await import('zod');
        fetchMock.mockResolvedValueOnce(jsonResponse([{id: 1, name: 'Navetta', capacity: 10}]));

        const {getJson} = await import('./httpClient');
        const schema = z.array(z.object({id: z.number(), name: z.string(), capacity: z.number()}));

        await expect(getJson('/Shuttles/GetShuttles', {schema})).resolves.toEqual([
            {id: 1, name: 'Navetta', capacity: 10}
        ]);
    });

    it('rispetta il timeout personalizzato passato nella config', async () => {
        fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
            const signal = (init as RequestInit).signal;
            signal?.addEventListener('abort', () => {
                const abortError = new Error('Aborted');
                abortError.name = 'AbortError';
                reject(abortError);
            });
        }));

        const {getJson} = await import('./httpClient');

        await expect(getJson('/Shuttles/GetShuttles', {timeoutMs: 20})).rejects.toThrow(/tempo massimo/);
    });

    it('gestisce una risposta 204 restituendo undefined', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, {status: 204}));

        const {putJsonAuth} = await import('./httpClient');
        const result = await putJsonAuth('/User/NotificationPreferences', {bookingConfirmations: true});

        expect(result).toBeUndefined();
    });
});
