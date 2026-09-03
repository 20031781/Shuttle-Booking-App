import {beforeEach, describe, expect, it, vi} from 'vitest';

import {shouldSkipNetworkFetch} from './connectivity';

const {
    checkApiReachabilityMock,
    getApiStatusSnapshotMock,
    isNetworkOnlineMock
} = vi.hoisted(() => ({
    checkApiReachabilityMock: vi.fn(),
    getApiStatusSnapshotMock: vi.fn(),
    isNetworkOnlineMock: vi.fn()
}));

vi.mock('@/api/apiStatus', () => ({
    checkApiReachability: checkApiReachabilityMock,
    getApiStatusSnapshot: getApiStatusSnapshotMock
}));

vi.mock('@/api/networkStatus', () => ({
    isNetworkOnline: isNetworkOnlineMock
}));

describe('shouldSkipNetworkFetch', () => {
    beforeEach(() => {
        checkApiReachabilityMock.mockReset();
        getApiStatusSnapshotMock.mockReset();
        isNetworkOnlineMock.mockReset();
        getApiStatusSnapshotMock.mockReturnValue({isApiReachable: null});
    });

    it('salta la richiesta quando il dispositivo è offline', async () => {
        isNetworkOnlineMock.mockResolvedValueOnce(false);

        await expect(shouldSkipNetworkFetch()).resolves.toBe(true);
        expect(checkApiReachabilityMock).not.toHaveBeenCalled();
    });

    it('non salta la richiesta quando rete e API risultano disponibili', async () => {
        isNetworkOnlineMock.mockResolvedValueOnce(true);
        getApiStatusSnapshotMock.mockReturnValueOnce({isApiReachable: true});

        await expect(shouldSkipNetworkFetch()).resolves.toBe(false);
    });

    it('ricontrolla l API quando lo stato precedente la dava irraggiungibile', async () => {
        isNetworkOnlineMock.mockResolvedValueOnce(true);
        getApiStatusSnapshotMock.mockReturnValueOnce({isApiReachable: false});
        checkApiReachabilityMock.mockResolvedValueOnce(true);

        await expect(shouldSkipNetworkFetch()).resolves.toBe(false);
        expect(checkApiReachabilityMock).toHaveBeenCalledOnce();
    });

    it('mantiene il fallback prudente se il controllo rete fallisce', async () => {
        isNetworkOnlineMock.mockRejectedValueOnce(new Error('network status unavailable'));
        getApiStatusSnapshotMock.mockReturnValueOnce({isApiReachable: false});
        checkApiReachabilityMock.mockResolvedValueOnce(false);

        await expect(shouldSkipNetworkFetch()).resolves.toBe(true);
    });
});
