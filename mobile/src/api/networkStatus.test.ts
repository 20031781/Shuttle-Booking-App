import {beforeEach, describe, expect, it, vi} from 'vitest';

import {isNetworkOnline, subscribeToNetworkChanges} from './networkStatus';

const {addEventListenerMock, fetchMock} = vi.hoisted(() => ({
    addEventListenerMock: vi.fn(),
    fetchMock: vi.fn()
}));

vi.mock('@react-native-community/netinfo', () => ({
    default: {
        addEventListener: addEventListenerMock,
        fetch: fetchMock
    }
}));

describe('networkStatus', () => {
    beforeEach(() => {
        addEventListenerMock.mockReset();
        fetchMock.mockReset();
    });

    it('preferisce isInternetReachable quando è disponibile', async () => {
        fetchMock.mockResolvedValueOnce({isConnected: true, isInternetReachable: false});

        await expect(isNetworkOnline()).resolves.toBe(false);
    });

    it('usa isConnected quando isInternetReachable non è disponibile', async () => {
        fetchMock.mockResolvedValueOnce({isConnected: true, isInternetReachable: null});

        await expect(isNetworkOnline()).resolves.toBe(true);
    });

    it('inoltra lo stato normalizzato e restituisce l unsubscribe nativo', () => {
        const unsubscribe = vi.fn();
        const listener = vi.fn();
        addEventListenerMock.mockImplementationOnce(callback => {
            callback({isConnected: false, isInternetReachable: null});
            return unsubscribe;
        });

        const dispose = subscribeToNetworkChanges(listener);

        expect(listener).toHaveBeenCalledWith(false);
        dispose();
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
