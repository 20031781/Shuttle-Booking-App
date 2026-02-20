import type { Shuttle } from '../types/domain';
import { apiConfig } from './config';
import { getJson } from './httpClient';

export interface ShuttleRepository {
  list(): Promise<Shuttle[]>;
}

type ShuttleApiResponse = {
  id: number;
  name: string;
  capacity: number;
};

const staticShuttles: Shuttle[] = [
  { id: '1', routeName: 'Sede → Aeroporto', departureTime: '07:30', seatsAvailable: 4 },
  { id: '2', routeName: 'Aeroporto → Sede', departureTime: '18:10', seatsAvailable: 7 },
  { id: '3', routeName: 'Sede → Centro città', departureTime: '09:00', seatsAvailable: 2 }
];

export class ApiShuttleRepository implements ShuttleRepository {
  async list(): Promise<Shuttle[]> {
    const shuttles = await getJson<ShuttleApiResponse[]>('/Shuttles/GetShuttles');

    return shuttles.map((shuttle) => ({
      id: String(shuttle.id),
      routeName: shuttle.name,
      departureTime: '--:--',
      seatsAvailable: shuttle.capacity
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
