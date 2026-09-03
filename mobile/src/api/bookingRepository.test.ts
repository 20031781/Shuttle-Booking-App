import {beforeEach, describe, expect, it, vi} from 'vitest';

const getJsonAuthMock = vi.fn();
const postJsonAuthMock = vi.fn();
const putJsonAuthMock = vi.fn();

vi.mock('./httpClient', () => ({
    getJsonAuth: getJsonAuthMock,
    postJsonAuth: postJsonAuthMock,
    putJsonAuth: putJsonAuthMock
}));

vi.mock('./config', () => ({
    apiConfig: {mockMode: false}
}));

function bookingDto(overrides?: Partial<{
    id: number;
    userId: number;
    userEmail: string;
    shuttleId: number;
    shuttleName: string;
    date: string;
    meetingAtUtc?: string;
    createdAt: string;
    isCanceled: boolean;
    canceledAt: string | null;
}>) {
    return {
        id: 1,
        userId: 5,
        userEmail: 'lorenzo@test.it',
        shuttleId: 3,
        shuttleName: 'Sede -> Aeroporto',
        date: '2026-08-01T00:00:00Z',
        createdAt: '2026-07-30T10:00:00Z',
        isCanceled: false,
        canceledAt: null,
        ...overrides
    };
}

describe('ApiBookingRepository', () => {
    beforeEach(() => {
        getJsonAuthMock.mockReset();
        postJsonAuthMock.mockReset();
        putJsonAuthMock.mockReset();
    });

    it('list() mappa isCanceled sullo status active/canceled senza seatsRemaining', async () => {
        getJsonAuthMock.mockResolvedValueOnce([bookingDto({isCanceled: false}), bookingDto({id: 2, isCanceled: true})]);

        const {ApiBookingRepository} = await import('./bookingRepository');
        const bookings = await new ApiBookingRepository().list();

        expect(bookings[0]).toMatchObject({id: '1', shuttleId: '3', status: 'active'});
        expect(bookings[0]!.seatsRemaining).toBeUndefined();
        expect(bookings[1]).toMatchObject({id: '2', status: 'canceled'});
    });

    it('propaga l orario effettivo dello shuttle nello storico', async () => {
        getJsonAuthMock.mockResolvedValueOnce([bookingDto({meetingAtUtc: '2026-08-01T08:30:00Z'})]);

        const {ApiBookingRepository} = await import('./bookingRepository');
        const bookings = await new ApiBookingRepository().list();

        expect(bookings[0]?.meetingAtUtc).toBe('2026-08-01T08:30:00Z');
    });

    it('create() converte shuttleId in numero, invia idempotency key e riporta seatsRemaining', async () => {
        postJsonAuthMock.mockResolvedValueOnce({
            booking: bookingDto({id: 9, shuttleId: 3}),
            seatsRemaining: 4,
            isIdempotentReplay: false
        });

        const {ApiBookingRepository} = await import('./bookingRepository');
        const booking = await new ApiBookingRepository().create('3', new Date('2026-08-01T00:00:00Z'));

        expect(booking).toMatchObject({id: '9', shuttleId: '3', status: 'active', seatsRemaining: 4});
        const [path, body, config] = postJsonAuthMock.mock.calls[0]!;
        expect(path).toBe('/Bookings/CreateBooking');
        expect(body).toMatchObject({shuttleId: 3, date: '2026-08-01T00:00:00.000Z'});
        expect(config.headers).toHaveProperty('X-Idempotency-Key');
        expect(config.schema).toBeDefined();
    });

    it('cancel() mappa la risposta e riporta seatsRemaining aggiornato', async () => {
        putJsonAuthMock.mockResolvedValueOnce({
            booking: bookingDto({id: 9, isCanceled: true}),
            seatsRemaining: 5,
            isIdempotentReplay: false
        });

        const {ApiBookingRepository} = await import('./bookingRepository');
        const booking = await new ApiBookingRepository().cancel('9');

        expect(booking).toMatchObject({id: '9', status: 'canceled', seatsRemaining: 5});
        expect(putJsonAuthMock.mock.calls[0]![0]).toBe('/Bookings/CancelBooking/9');
    });
});
