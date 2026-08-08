import type {z} from 'zod';

import type {ManagerShuttle} from '@/types/domain';
import {apiConfig} from './config';
import {deleteJsonAuth, getJsonAuth, postJsonAuth, putJsonAuth} from './httpClient';
import {managerShuttleApiListSchema, managerShuttleApiSchema} from './schemas';

type ShuttleApiResponse = z.infer<typeof managerShuttleApiSchema>;

type CreateShuttlePayload = {
    name: string;
    capacity: number;
    meetingAtUtc: string;
};

type UpdateShuttlePayload = {
    name: string;
    capacity: number;
    meetingAtUtc: string;
};

export interface ManagerShuttleRepository {
    list(): Promise<ManagerShuttle[]>;

    create(name: string, capacity: number, meetingAtUtc: string): Promise<ManagerShuttle>;

    update(id: string, name: string, capacity: number, meetingAtUtc: string): Promise<ManagerShuttle>;

    delete(id: string): Promise<void>;
}

function mapApiShuttle(shuttle: ShuttleApiResponse): ManagerShuttle {
    return {
        id: String(shuttle.id),
        name: shuttle.name,
        capacity: shuttle.capacity,
        availableSeats: shuttle.availableSeats,
        meetingAtUtc: shuttle.meetingAtUtc
    };
}

export class ApiManagerShuttleRepository implements ManagerShuttleRepository {
    async list(): Promise<ManagerShuttle[]> {
        const shuttles = await getJsonAuth('/Shuttles/GetShuttles', {schema: managerShuttleApiListSchema});
        return shuttles.map(mapApiShuttle);
    }

    async create(name: string, capacity: number, meetingAtUtc: string): Promise<ManagerShuttle> {
        const shuttle = await postJsonAuth<CreateShuttlePayload, ShuttleApiResponse>(
            '/Shuttles/CreateShuttle',
            {
                name,
                capacity,
                meetingAtUtc
            },
            {schema: managerShuttleApiSchema}
        );
        return mapApiShuttle(shuttle);
    }

    async update(id: string, name: string, capacity: number, meetingAtUtc: string): Promise<ManagerShuttle> {
        const shuttle = await putJsonAuth<UpdateShuttlePayload, ShuttleApiResponse>(
            `/Shuttles/UpdateShuttleDetails/${id}`,
            {
                name,
                capacity,
                meetingAtUtc
            },
            {schema: managerShuttleApiSchema}
        );
        return mapApiShuttle(shuttle);
    }

    async delete(id: string): Promise<void> {
        await deleteJsonAuth<void>(`/Shuttles/DeleteShuttle/${id}`);
    }
}

const staticManagerShuttles: ManagerShuttle[] = [
    {
        id: '1',
        name: 'Sede -> Aeroporto',
        capacity: 10,
        availableSeats: 6,
        meetingAtUtc: new Date(Date.now() + 60 * 60_000).toISOString()
    }
];

export class StaticManagerShuttleRepository implements ManagerShuttleRepository {
    list(): Promise<ManagerShuttle[]> {
        return Promise.resolve([...staticManagerShuttles]);
    }

    create(name: string, capacity: number, meetingAtUtc: string): Promise<ManagerShuttle> {
        const shuttle: ManagerShuttle = {
            id: String(Date.now()),
            name,
            capacity,
            availableSeats: capacity,
            meetingAtUtc
        };
        staticManagerShuttles.push(shuttle);
        return Promise.resolve(shuttle);
    }

    update(id: string, name: string, capacity: number, meetingAtUtc: string): Promise<ManagerShuttle> {
        const shuttle = staticManagerShuttles.find(item => item.id === id);
        if (!shuttle) {
            return Promise.reject(new Error('Shuttle non trovata.'));
        }

        shuttle.name = name;
        shuttle.capacity = capacity;
        shuttle.meetingAtUtc = meetingAtUtc;
        shuttle.availableSeats = Math.min(shuttle.availableSeats, capacity);
        return Promise.resolve(shuttle);
    }

    delete(id: string): Promise<void> {
        const index = staticManagerShuttles.findIndex(item => item.id === id);
        if (index >= 0) {
            staticManagerShuttles.splice(index, 1);
        }

        return Promise.resolve();
    }
}

export function createManagerShuttleRepository(): ManagerShuttleRepository {
    return apiConfig.mockMode ? new StaticManagerShuttleRepository() : new ApiManagerShuttleRepository();
}
