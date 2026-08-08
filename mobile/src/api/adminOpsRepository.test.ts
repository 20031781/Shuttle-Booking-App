import {beforeEach, describe, expect, it, vi} from 'vitest';

const getJsonAuthMock = vi.fn();

vi.mock('./httpClient', () => ({
    getJsonAuth: getJsonAuthMock,
    heavyRequestTimeoutMs: 30_000
}));

vi.mock('./config', () => ({
    apiConfig: {mockMode: false}
}));

describe('ApiAdminOpsRepository.getOverview', () => {
    beforeEach(() => {
        getJsonAuthMock.mockReset();
    });

    it('chiama l\'endpoint senza query string quando non è passata una data', async () => {
        getJsonAuthMock.mockResolvedValueOnce({});

        const {ApiAdminOpsRepository} = await import('./adminOpsRepository');
        await new ApiAdminOpsRepository().getOverview();

        expect(getJsonAuthMock.mock.calls[0]![0]).toBe('/AdminOps/Overview');
    });

    it('appende la data come query param ISO codificato quando è passata', async () => {
        getJsonAuthMock.mockResolvedValueOnce({});

        const {ApiAdminOpsRepository} = await import('./adminOpsRepository');
        const date = new Date('2026-08-01T00:00:00Z');
        await new ApiAdminOpsRepository().getOverview(date);

        expect(getJsonAuthMock.mock.calls[0]![0]).toBe(
            `/AdminOps/Overview?date=${encodeURIComponent(date.toISOString())}`
        );
    });

    it('getHealth() chiama l\'endpoint Health', async () => {
        getJsonAuthMock.mockResolvedValueOnce({});

        const {ApiAdminOpsRepository} = await import('./adminOpsRepository');
        await new ApiAdminOpsRepository().getHealth();

        expect(getJsonAuthMock.mock.calls[0]![0]).toBe('/AdminOps/Health');
    });

    it('usa un timeout maggiorato per la overview (endpoint aggregante)', async () => {
        getJsonAuthMock.mockResolvedValueOnce({});

        const {ApiAdminOpsRepository} = await import('./adminOpsRepository');
        await new ApiAdminOpsRepository().getOverview();

        const [, config] = getJsonAuthMock.mock.calls[0]!;
        expect(config.timeoutMs).toBeGreaterThan(8_000);
    });
});
