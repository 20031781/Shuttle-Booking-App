import type { Shuttle } from '../types/domain';
import { t } from '../i18n';
import { apiConfig } from './config';
import { getJson } from './httpClient';

export interface ShuttleRepository {
  list(): Promise<Shuttle[]>;
}

type ShuttleApiResponse = {
  id: number;
  name: string;
  capacity: number;
  availableSeats?: number;
};

const staticShuttles: Shuttle[] = [
  { id: '1', routeName: t.mock.shuttleNames.toAirport, departureTime: '07:30', seatsAvailable: 4 },
  { id: '2', routeName: t.mock.shuttleNames.fromAirport, departureTime: '18:10', seatsAvailable: 7 },
  { id: '3', routeName: t.mock.shuttleNames.toCenter, departureTime: '09:00', seatsAvailable: 2 }
];

export class ApiShuttleRepository implements ShuttleRepository {
  async list(): Promise<Shuttle[]> {
    const today = new Date().toISOString();
    const shuttles = await getJson<ShuttleApiResponse[]>(`/Shuttles/GetShuttles?date=${encodeURIComponent(today)}`);

    return shuttles.map((shuttle) => ({
      id: String(shuttle.id),
      routeName: shuttle.name,
      departureTime: t.mock.departureUnknown,
      seatsAvailable: shuttle.availableSeats ?? shuttle.capacity
    }));
  }
}

export class StaticShuttleRepository implements ShuttleRepository {
  async list(): Promise<Shuttle[]> {
    return staticShuttles;
  }
}

export function createShuttleRepository(): ShuttleRepository {
  return apiConfig.mockMode ? new StaticShuttleRepository() : new ApiShuttleRepository();
}
