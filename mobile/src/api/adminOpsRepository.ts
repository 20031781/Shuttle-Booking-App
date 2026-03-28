import {apiConfig} from './config';
import {getJsonAuth} from './httpClient';

export type AdminHealthStatus = 'Healthy' | 'Degraded' | 'Unhealthy' | 'Disabled';

export type AdminComponentStatus = {
    name: string;
    status: AdminHealthStatus;
    details?: string | null;
};

export type AdminHealth = {
    checkedAtUtc: string;
    overallStatus: AdminHealthStatus;
    components: AdminComponentStatus[];
};

export type AdminShuttleOperational = {
    shuttleId: number;
    shuttleName: string;
    capacity: number;
    activeBookings: number;
    seatsAvailable: number;
    occupancyPercent: number;
};

export type AdminOverview = {
    date: string;
    generatedAtUtc: string;
    totalUsers: number;
    totalShuttles: number;
    bookingsCreated: number;
    activeBookings: number;
    canceledBookings: number;
    totalCapacity: number;
    seatsAvailable: number;
    occupancyPercent: number;
    cancellationRatePercent: number;
    shuttles: AdminShuttleOperational[];
};

export interface AdminOpsRepository {
    getOverview(date?: Date): Promise<AdminOverview>;

    getHealth(): Promise<AdminHealth>;
}

function createOverviewPath(date?: Date): string {
    if (!date) {
        return '/AdminOps/Overview';
    }

    return `/AdminOps/Overview?date=${encodeURIComponent(date.toISOString())}`;
}

export class ApiAdminOpsRepository implements AdminOpsRepository {
    async getOverview(date?: Date): Promise<AdminOverview> {
        return getJsonAuth<AdminOverview>(createOverviewPath(date));
    }

    async getHealth(): Promise<AdminHealth> {
        return getJsonAuth<AdminHealth>('/AdminOps/Health');
    }
}

const mockOverview: AdminOverview = {
    date: new Date().toISOString(),
    generatedAtUtc: new Date().toISOString(),
    totalUsers: 28,
    totalShuttles: 3,
    bookingsCreated: 16,
    activeBookings: 12,
    canceledBookings: 4,
    totalCapacity: 30,
    seatsAvailable: 18,
    occupancyPercent: 40,
    cancellationRatePercent: 25,
    shuttles: [
        {
            shuttleId: 1,
            shuttleName: 'Sede -> Aeroporto',
            capacity: 10,
            activeBookings: 6,
            seatsAvailable: 4,
            occupancyPercent: 60
        },
        {
            shuttleId: 2,
            shuttleName: 'Aeroporto -> Sede',
            capacity: 10,
            activeBookings: 4,
            seatsAvailable: 6,
            occupancyPercent: 40
        },
        {
            shuttleId: 3,
            shuttleName: 'Sede -> Centro',
            capacity: 10,
            activeBookings: 2,
            seatsAvailable: 8,
            occupancyPercent: 20
        }
    ]
};

const mockHealth: AdminHealth = {
    checkedAtUtc: new Date().toISOString(),
    overallStatus: 'Healthy',
    components: [
        {name: 'api', status: 'Healthy', details: 'API online'},
        {name: 'database', status: 'Healthy', details: 'Connessione DB OK'},
        {name: 'push', status: 'Disabled', details: 'Push disabilitate'}
    ]
};

export class StaticAdminOpsRepository implements AdminOpsRepository {
    async getOverview(): Promise<AdminOverview> {
        return mockOverview;
    }

    async getHealth(): Promise<AdminHealth> {
        return mockHealth;
    }
}

export function createAdminOpsRepository(): AdminOpsRepository {
    return apiConfig.mockMode ? new StaticAdminOpsRepository() : new ApiAdminOpsRepository();
}
