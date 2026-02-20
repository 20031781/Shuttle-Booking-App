import type { Shuttle } from '../types/domain';

export interface ShuttleRepository {
  list(): Promise<Shuttle[]>;
}

const staticShuttles: Shuttle[] = [
  { id: '1', routeName: 'Sede → Aeroporto', departureTime: '07:30', seatsAvailable: 4 },
  { id: '2', routeName: 'Aeroporto → Sede', departureTime: '18:10', seatsAvailable: 7 },
  { id: '3', routeName: 'Sede → Centro città', departureTime: '09:00', seatsAvailable: 2 }
];

export class StaticShuttleRepository implements ShuttleRepository {
  async list(): Promise<Shuttle[]> {
    return staticShuttles;
  }
}
