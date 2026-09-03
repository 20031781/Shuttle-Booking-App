import {z} from 'zod';

/**
 * Schemi delle risposte API. Servono a fallire *al confine* con un messaggio
 * chiaro quando il backend cambia forma, invece di propagare `undefined` dentro
 * la UI e crashare lontano dalla causa reale.
 */

export const shuttleApiSchema = z.object({
    id: z.number(),
    name: z.string(),
    capacity: z.number(),
    availableSeats: z.number().optional(),
    meetingAtUtc: z.string().optional()
});

export const shuttleApiListSchema = z.array(shuttleApiSchema);

export const managerShuttleApiSchema = z.object({
    id: z.number(),
    name: z.string(),
    capacity: z.number(),
    availableSeats: z.number(),
    meetingAtUtc: z.string()
});

export const managerShuttleApiListSchema = z.array(managerShuttleApiSchema);

export const bookingApiSchema = z.object({
    id: z.number(),
    userId: z.number(),
    userEmail: z.string(),
    shuttleId: z.number(),
    shuttleName: z.string(),
    date: z.string(),
    meetingAtUtc: z.string().optional(),
    createdAt: z.string(),
    isCanceled: z.boolean(),
    canceledAt: z.string().nullable()
});

export const bookingApiListSchema = z.array(bookingApiSchema);

export const bookingActionApiSchema = z.object({
    booking: bookingApiSchema,
    seatsRemaining: z.number(),
    isIdempotentReplay: z.boolean()
});

export const userApiSchema = z.object({
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    city: z.string(),
    username: z.string().nullable(),
    club: z.string().nullable(),
    isProfileCompleted: z.boolean()
});

export const userAccessApiSchema = z.object({
    isAdmin: z.boolean(),
    isManager: z.boolean()
});

/** Risposta di login/registrazione/refresh: è il payload più delicato dell'app. */
export const loginApiSchema = z.object({
    token: z.string(),
    expiration: z.string(),
    refreshToken: z.string(),
    refreshTokenExpiration: z.string(),
    user: userApiSchema
});

const adminHealthStatusSchema = z.enum(['Healthy', 'Degraded', 'Unhealthy', 'Disabled']);

export const adminHealthApiSchema = z.object({
    checkedAtUtc: z.string(),
    overallStatus: adminHealthStatusSchema,
    components: z.array(z.object({
        name: z.string(),
        status: adminHealthStatusSchema,
        details: z.string().nullish()
    }))
});

export const adminOverviewApiSchema = z.object({
    date: z.string(),
    generatedAtUtc: z.string(),
    totalUsers: z.number(),
    totalShuttles: z.number(),
    bookingsCreated: z.number(),
    activeBookings: z.number(),
    canceledBookings: z.number(),
    totalCapacity: z.number(),
    seatsAvailable: z.number(),
    occupancyPercent: z.number(),
    cancellationRatePercent: z.number(),
    shuttles: z.array(z.object({
        shuttleId: z.number(),
        shuttleName: z.string(),
        capacity: z.number(),
        activeBookings: z.number(),
        seatsAvailable: z.number(),
        occupancyPercent: z.number()
    }))
});
