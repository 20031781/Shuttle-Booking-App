import type {z} from 'zod';

import type {Booking, BookingStatus} from '@/types/domain';
import {t} from '@/i18n';
import {apiConfig} from './config';
import {getJsonAuth, postJsonAuth, putJsonAuth} from './httpClient';
import {bookingActionApiSchema, bookingApiListSchema, type bookingApiSchema} from './schemas';

type BookingApiDto = z.infer<typeof bookingApiSchema>;

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
        const bookings = await getJsonAuth('/Bookings/GetUserHistory', {schema: bookingApiListSchema});
        return bookings.map(booking => mapApiBooking(booking));
    }

    async create(shuttleId: string, date: Date = new Date()): Promise<Booking> {
        const idempotencyKey = createIdempotencyKey(shuttleId, date);
        const response = await postJsonAuth(
            '/Bookings/CreateBooking',
            {
                shuttleId: Number(shuttleId),
                date: date.toISOString()
            },
            {
                schema: bookingActionApiSchema,
                headers: {
                    'X-Idempotency-Key': idempotencyKey
                }
            }
        );

        return mapApiBooking(response.booking, response.seatsRemaining);
    }

    async cancel(bookingId: string): Promise<Booking> {
        const response = await putJsonAuth(
            `/Bookings/CancelBooking/${bookingId}`,
            undefined,
            {schema: bookingActionApiSchema}
        );
        return mapApiBooking(response.booking, response.seatsRemaining);
    }
}

export class StaticBookingRepository implements BookingRepository {
    list(): Promise<Booking[]> {
        return Promise.resolve([...staticBookings].sort((a, b) => b.date.localeCompare(a.date)));
    }

    create(shuttleId: string, date: Date = new Date()): Promise<Booking> {
        const booking: Booking = {
            id: String(Date.now()),
            shuttleId,
            shuttleName: `${t.bookings.shuttleFallbackName} ${shuttleId}`,
            date: date.toISOString(),
            status: 'active',
            seatsRemaining: Math.max(0, 5 - staticBookings.filter(item => item.status === 'active').length)
        };

        staticBookings.unshift(booking);
        return Promise.resolve(booking);
    }

    cancel(bookingId: string): Promise<Booking> {
        const booking = staticBookings.find(item => item.id === bookingId);
        if (!booking) {
            return Promise.reject(new Error(t.bookings.bookingNotFound));
        }

        booking.status = 'canceled';
        booking.seatsRemaining = 5;
        return Promise.resolve(booking);
    }
}

export function createBookingRepository(): BookingRepository {
    return apiConfig.mockMode ? new StaticBookingRepository() : new ApiBookingRepository();
}
