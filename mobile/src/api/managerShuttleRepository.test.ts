import {beforeEach, describe, expect, it, vi} from 'vitest';

const getJsonAuthMock = vi.fn();
const postJsonAuthMock = vi.fn();
const putJsonAuthMock = vi.fn();
const deleteJsonAuthMock = vi.fn();

vi.mock('./httpClient', () => ({
    getJsonAuth: getJsonAuthMock,
    postJsonAuth: postJsonAuthMock,
    putJsonAuth: putJsonAuthMock,
    deleteJsonAuth: deleteJsonAuthMock
}));

vi.mock('./config', () => ({
    apiConfig: {mockMode: false}
}));

const apiShuttle = {
    id: 4,
    name: 'Sede -> Aeroporto',
    capacity: 10,
    availableSeats: 6,
    meetingAtUtc: '2026-08-01T07:30:00Z'
};

describe('ApiManagerShuttleRepository', () => {
    beforeEach(() => {
        getJsonAuthMock.mockReset();
        postJsonAuthMock.mockReset();
        putJsonAuthMock.mockReset();
        deleteJsonAuthMock.mockReset();
    });

    it('list() mappa id a stringa mantenendo gli altri campi', async () => {
        getJsonAuthMock.mockResolvedValueOnce([apiShuttle]);

        const {ApiManagerShuttleRepository} = await import('./managerShuttleRepository');
        const [shuttle] = await new ApiManagerShuttleRepository().list();

        expect(shuttle).toEqual({
            id: '4',
            name: 'Sede -> Aeroporto',
            capacity: 10,
            availableSeats: 6,
            meetingAtUtc: '2026-08-01T07:30:00Z'
        });
    });

    it('create() invia il payload corretto e mappa la risposta', async () => {
        postJsonAuthMock.mockResolvedValueOnce(apiShuttle);

        const {ApiManagerShuttleRepository} = await import('./managerShuttleRepository');
        const shuttle = await new ApiManagerShuttleRepository().create('Sede -> Aeroporto', 10, '2026-08-01T07:30:00Z');

        const [createPath, createBody] = postJsonAuthMock.mock.calls[0]!;
        expect(createPath).toBe('/Shuttles/CreateShuttle');
        expect(createBody).toEqual({
            name: 'Sede -> Aeroporto',
            capacity: 10,
            meetingAtUtc: '2026-08-01T07:30:00Z'
        });
        expect(shuttle.id).toBe('4');
    });

    it('update() chiama l\'endpoint con id nel path e mappa la risposta', async () => {
        putJsonAuthMock.mockResolvedValueOnce({...apiShuttle, capacity: 12});

        const {ApiManagerShuttleRepository} = await import('./managerShuttleRepository');
        const shuttle = await new ApiManagerShuttleRepository().update('4', 'Sede -> Aeroporto', 12, '2026-08-01T07:30:00Z');

        const [updatePath, updateBody] = putJsonAuthMock.mock.calls[0]!;
        expect(updatePath).toBe('/Shuttles/UpdateShuttleDetails/4');
        expect(updateBody).toEqual({
            name: 'Sede -> Aeroporto',
            capacity: 12,
            meetingAtUtc: '2026-08-01T07:30:00Z'
        });
        expect(shuttle.capacity).toBe(12);
    });

    it('delete() chiama l\'endpoint con id nel path', async () => {
        deleteJsonAuthMock.mockResolvedValueOnce(undefined);

        const {ApiManagerShuttleRepository} = await import('./managerShuttleRepository');
        await new ApiManagerShuttleRepository().delete('4');

        expect(deleteJsonAuthMock).toHaveBeenCalledWith('/Shuttles/DeleteShuttle/4');
    });
});
