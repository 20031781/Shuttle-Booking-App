import type { Booking, BookingStatus } from '../types/domain';
import { t } from '../i18n';
import { apiConfig } from './config';
import { getJson, HttpError, postJson, putJson } from './httpClient';

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
};

type RegisterUserRequest = {
  email: string;
  firstName: string;
  lastName: string;
  authProvider: string;
  phoneCountryCode: string;
  city: string;
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

function buildDefaultRegisterPayload(email: string): RegisterUserRequest {
  const prefix = email.split('@')[0] || t.mock.user.firstNameFallback.toLowerCase();
  const normalized = prefix.replace(/[^a-zA-Z]/g, '');
  const firstName = normalized.length > 0 ? normalized : t.mock.user.firstNameFallback;

  return {
    email,
    firstName,
    lastName: t.mock.user.lastName,
    authProvider: 'App',
    phoneCountryCode: '+39',
    city: t.mock.user.city
  };
}

export class ApiBookingRepository implements BookingRepository {
  async list(): Promise<Booking[]> {
    const bookings = await getJson<BookingApiDto[]>(
      `/Bookings/GetUserHistory/${encodeURIComponent(apiConfig.profileEmail)}`
    );

    return bookings.map((booking) => mapApiBooking(booking));
  }

  async create(shuttleId: string, date: Date = new Date()): Promise<Booking> {
    await this.ensureUserExists();

    const response = await postJson<
      { userEmail: string; shuttleId: number; date: string },
      BookingActionApiResponse
    >('/Bookings/CreateBooking', {
      userEmail: apiConfig.profileEmail,
      shuttleId: Number(shuttleId),
      date: date.toISOString()
    });

    return mapApiBooking(response.booking, response.seatsRemaining);
  }

  async cancel(bookingId: string): Promise<Booking> {
    const response = await putJson<{ userEmail: string }, BookingActionApiResponse>(
      `/Bookings/CancelBooking/${bookingId}`,
      { userEmail: apiConfig.profileEmail }
    );

    return mapApiBooking(response.booking, response.seatsRemaining);
  }

  private async ensureUserExists(): Promise<void> {
    try {
      await postJson<RegisterUserRequest, unknown>('/User/register', buildDefaultRegisterPayload(apiConfig.profileEmail));
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 409) {
        return;
      }

      throw error;
    }
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
      seatsRemaining: Math.max(0, 5 - staticBookings.filter((item) => item.status === 'active').length)
    };

    staticBookings.unshift(booking);
    return booking;
  }

  async cancel(bookingId: string): Promise<Booking> {
    const booking = staticBookings.find((item) => item.id === bookingId);
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
