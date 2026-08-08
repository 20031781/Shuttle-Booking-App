import type {Shuttle} from '@/types/domain';
import {t} from '@/i18n';
import {apiConfig} from './config';
import {getJson} from './httpClient';
import {shuttleApiListSchema} from './schemas';

export interface ShuttleRepository {
    list(): Promise<Shuttle[]>;
}

function formatDepartureTime(meetingAtUtc: string | undefined): string {
    if (!meetingAtUtc) {
        return t.mock.departureUnknown;
    }

    const parsed = new Date(meetingAtUtc);
    if (Number.isNaN(parsed.getTime())) {
        return t.mock.departureUnknown;
    }

    const datePart = parsed.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'short'
    });
    const timePart = parsed.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `${datePart} · ${timePart}`;
}

const staticShuttles: Shuttle[] = [
    {
        id: '1',
        routeName: t.mock.shuttleNames.toAirport,
        departureTime: '07:30',
        meetingAtUtc: new Date(Date.now() + 90 * 60_000).toISOString(),
        seatsAvailable: 4
    },
    {
        id: '2',
        routeName: t.mock.shuttleNames.fromAirport,
        departureTime: '18:10',
        meetingAtUtc: new Date(Date.now() + 6 * 60 * 60_000).toISOString(),
        seatsAvailable: 7
    },
    {
        id: '3',
        routeName: t.mock.shuttleNames.toCenter,
        departureTime: '09:00',
        meetingAtUtc: new Date(Date.now() + 24 * 60 * 60_000).toISOString(),
        seatsAvailable: 2
    }
];

export class ApiShuttleRepository implements ShuttleRepository {
    async list(): Promise<Shuttle[]> {
        const shuttles = await getJson('/Shuttles/GetShuttles', {schema: shuttleApiListSchema});

        return shuttles.map(shuttle => ({
            id: String(shuttle.id),
            routeName: shuttle.name,
            departureTime: formatDepartureTime(shuttle.meetingAtUtc),
            meetingAtUtc: shuttle.meetingAtUtc ?? new Date().toISOString(),
            seatsAvailable: shuttle.availableSeats ?? shuttle.capacity
        }));
    }
}

export class StaticShuttleRepository implements ShuttleRepository {
    list(): Promise<Shuttle[]> {
        return Promise.resolve(staticShuttles);
    }
}

export function createShuttleRepository(): ShuttleRepository {
    return apiConfig.mockMode ? new StaticShuttleRepository() : new ApiShuttleRepository();
}
