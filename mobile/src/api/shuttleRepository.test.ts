import {beforeEach, describe, expect, it, vi} from 'vitest';

const getJsonAuthMock = vi.fn();

vi.mock('./httpClient', () => ({
    getJsonAuth: getJsonAuthMock
}));

vi.mock('./config', () => ({
    apiConfig: {mockMode: false}
}));

describe('ApiShuttleRepository.list', () => {
    beforeEach(() => {
        getJsonAuthMock.mockReset();
    });

    it('mappa id a stringa e mantiene la data/ora di ritrovo', async () => {
        getJsonAuthMock.mockResolvedValueOnce([
            {id: 7, name: 'Sede -> Aeroporto', capacity: 10, availableSeats: 4, meetingAtUtc: '2026-08-01T07:30:00Z'}
        ]);

        const {ApiShuttleRepository} = await import('./shuttleRepository');
        const [shuttle] = await new ApiShuttleRepository().list();

        expect(shuttle!.id).toBe('7');
        expect(shuttle!.routeName).toBe('Sede -> Aeroporto');
        expect(shuttle!.meetingAtUtc).toBe('2026-08-01T07:30:00Z');
        expect(shuttle!.seatsAvailable).toBe(4);
        expect(shuttle!.departureTime.length).toBeGreaterThan(0);
    });

    it('usa la capacità come fallback quando availableSeats manca', async () => {
        getJsonAuthMock.mockResolvedValueOnce([
            {id: 1, name: 'Navetta', capacity: 8, meetingAtUtc: '2026-08-01T07:30:00Z'}
        ]);

        const {ApiShuttleRepository} = await import('./shuttleRepository');
        const [shuttle] = await new ApiShuttleRepository().list();

        expect(shuttle!.seatsAvailable).toBe(8);
    });

    it('genera una data di ritrovo valida quando meetingAtUtc manca', async () => {
        getJsonAuthMock.mockResolvedValueOnce([{id: 2, name: 'Navetta', capacity: 5}]);

        const {ApiShuttleRepository} = await import('./shuttleRepository');
        const [shuttle] = await new ApiShuttleRepository().list();

        expect(Number.isNaN(new Date(shuttle!.meetingAtUtc).getTime())).toBe(false);
    });
});
