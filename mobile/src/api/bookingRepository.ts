import type {Booking, BookingStatus} from '../types/domain';
import {t} from '../i18n';
import {apiConfig} from './config';
import {getJsonAuth, postJsonAuth, putJsonAuth} from './httpClient';

type BookingApiDto = {
    id: number;
    userId: number;
    userEmail: string;
    shuttleId: number;
    shuttleName: string;
    date: string;
    createdAt: string;
    isCanceled: boolean;
    canceledAt: string | null;
};

type BookingActionApiResponse = {
    booking: BookingApiDto;
    seatsRemaining: number;
    isIdempotentReplay: boolean;
};

export interface BookingRepository {
    list(): Promise<Booking[]>;

    create(shuttleId: string, date?: Date): Promise<Booking>;

    cancel(bookingId: string): Promise<Booking>;
}

const staticBookings: Booking[] = [];

function mapStatus(isCanceled: boolean): BookingStatus {
    return isCanceled ? 'canceled' : 'active';
}

function mapApiBooking(dto: BookingApiDto, seatsRemaining?: number): Booking {
    return {
        id: String(dto.id),
        shuttleId: String(dto.shuttleId),
        shuttleName: dto.shuttleName,
        date: dto.date,
        status: mapStatus(dto.isCanceled),
        seatsRemaining
    };
}

function createIdempotencyKey(shuttleId: string, date: Date): string {
    const dateKey = date.toISOString().slice(0, 10);
    const randomSuffix = Math.random().toString(36).slice(2, 10);
    return `booking-${shuttleId}-${dateKey}-${randomSuffix}`;
}

export class ApiBookingRepository implements BookingRepository {
    async list(): Promise<Booking[]> {
        const bookings = await getJsonAuth<BookingApiDto[]>('/Bookings/GetUserHistory');
        return bookings.map(booking => mapApiBooking(booking));
    }

    async create(shuttleId: string, date: Date = new Date()): Promise<Booking> {
        const idempotencyKey = createIdempotencyKey(shuttleId, date);
        const response = await postJsonAuth<{ shuttleId: number; date: string }, BookingActionApiResponse>(
            '/Bookings/CreateBooking',
            {
                shuttleId: Number(shuttleId),
                date: date.toISOString()
            },
            {
                'X-Idempotency-Key': idempotencyKey
            }
        );

        return mapApiBooking(response.booking, response.seatsRemaining);
    }

    async cancel(bookingId: string): Promise<Booking> {
        const response = await putJsonAuth<object, BookingActionApiResponse>(`/Bookings/CancelBooking/${bookingId}`);
        return mapApiBooking(response.booking, response.seatsRemaining);
    }
}

export class StaticBookingRepository implements BookingRepository {
    async list(): Promise<Booking[]> {
        return [...staticBookings].sort((a, b) => b.date.localeCompare(a.date));
    }

    async create(shuttleId: string, date: Date = new Date()): Promise<Booking> {
        const booking: Booking = {
            id: String(Date.now()),
            shuttleId,
            shuttleName: `${t.bookings.shuttleFallbackName} ${shuttleId}`,
            date: date.toISOString(),
            status: 'active',
            seatsRemaining: Math.max(0, 5 - staticBookings.filter(item => item.status === 'active').length)
        };

        staticBookings.unshift(booking);
        return booking;
    }

    async cancel(bookingId: string): Promise<Booking> {
        const booking = staticBookings.find(item => item.id === bookingId);
        if (!booking) {
            throw new Error(t.bookings.bookingNotFound);
        }

        booking.status = 'canceled';
        booking.seatsRemaining = 5;
        return booking;
    }
}

export function createBookingRepository(): BookingRepository {
    return apiConfig.mockMode ? new StaticBookingRepository() : new ApiBookingRepository();
}
