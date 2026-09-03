import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
    __resetApiStatusForTests,
    checkApiReachability,
    getApiStatusSnapshot,
    setApiReachable,
    subscribeToApiStatus
} from './apiStatus';

vi.mock('./config', () => ({
    apiConfig: {
        baseUrl: 'http://localhost:5000'
    }
}));

describe('apiStatus', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
        __resetApiStatusForTests();
    });

    it('considera raggiungibile il backend che restituisce una risposta HTTP', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, {status: 503}));

        await expect(checkApiReachability()).resolves.toBe(true);
        expect(getApiStatusSnapshot()).toMatchObject({
            isApiReachable: true,
            source: 'healthcheck'
        });
    });

    it('segnala il backend non raggiungibile su errore di trasporto', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

        await expect(checkApiReachability()).resolves.toBe(false);
        expect(getApiStatusSnapshot()).toMatchObject({
            isApiReachable: false,
            source: 'healthcheck'
        });
    });

    it('notifica i cambi di stato ai componenti iscritti', () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToApiStatus(listener);

        expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
            isApiReachable: null,
            source: 'unknown'
        }));

        setApiReachable(false, 'error');
        expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
            isApiReachable: false,
            source: 'error'
        }));

        unsubscribe();
        setApiReachable(true, 'response');
        expect(listener).toHaveBeenCalledTimes(2);
    });
});
