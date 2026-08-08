import type {z} from 'zod';

import type {UserAccess, UserProfile} from '@/types/domain';
import {t} from '@/i18n';
import {cacheUserProfile, getCachedUserProfile, isNetworkRequestError} from './authSession';
import {apiConfig} from './config';
import {getJsonAuth, putJsonAuth} from './httpClient';
import {userAccessApiSchema, userApiSchema} from './schemas';

export type CompleteUserProfileInput = {
    firstName: string;
    lastName: string;
    club: string;
    city: string;
};

export interface ProfileRepository {
    get(): Promise<UserProfile>;

    updateProfile(firstName: string, lastName: string, username: string): Promise<UserProfile>;

    completeFirstAccessProfile(input: CompleteUserProfileInput): Promise<UserProfile>;

    getAccess(): Promise<UserAccess>;
}

type UserApiResponse = z.infer<typeof userApiSchema>;

const fallbackProfile: UserProfile = {
    firstName: t.profile.fallback.firstName,
    lastName: t.profile.fallback.lastName,
    email: t.profile.fallback.email,
    city: t.profile.fallback.city,
    club: t.profile.fallback.club,
    username: t.profile.fallback.username,
    isProfileCompleted: true
};

function mapUserToProfile(user: UserApiResponse): UserProfile {
    return {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        city: user.isProfileCompleted ? user.city : '',
        club: user.club ?? '',
        username: user.username ?? '',
        isProfileCompleted: user.isProfileCompleted
    };
}

export class ApiProfileRepository implements ProfileRepository {
    async get(): Promise<UserProfile> {
        try {
            const user = await getJsonAuth('/User/Me', {schema: userApiSchema});
            const mappedProfile = mapUserToProfile(user);
            await cacheUserProfile(mappedProfile);
            return mappedProfile;
        } catch (error) {
            if (isNetworkRequestError(error)) {
                const cachedProfile = await getCachedUserProfile();
                if (cachedProfile) {
                    return cachedProfile;
                }
            }

            throw error;
        }
    }

    async updateProfile(firstName: string, lastName: string, username: string): Promise<UserProfile> {
        const user = await putJsonAuth<{ firstName: string; lastName: string; username: string }, UserApiResponse>(
            '/User/Me',
            {
                firstName,
                lastName,
                username
            },
            {schema: userApiSchema}
        );
        const mappedProfile = mapUserToProfile(user);
        await cacheUserProfile(mappedProfile);
        return mappedProfile;
    }

    async completeFirstAccessProfile(input: CompleteUserProfileInput): Promise<UserProfile> {
        const user = await putJsonAuth<CompleteUserProfileInput, UserApiResponse>(
            '/User/CompleteProfile',
            input,
            {schema: userApiSchema}
        );
        const mappedProfile = mapUserToProfile(user);
        await cacheUserProfile(mappedProfile);
        return mappedProfile;
    }

    async getAccess(): Promise<UserAccess> {
        return getJsonAuth('/User/Access', {schema: userAccessApiSchema});
    }
}

export class StaticProfileRepository implements ProfileRepository {
    get(): Promise<UserProfile> {
        return Promise.resolve(fallbackProfile);
    }

    updateProfile(firstName: string, lastName: string, username: string): Promise<UserProfile> {
        return Promise.resolve({
            ...fallbackProfile,
            firstName,
            lastName,
            username
        });
    }

    completeFirstAccessProfile(input: CompleteUserProfileInput): Promise<UserProfile> {
        return Promise.resolve({
            ...fallbackProfile,
            firstName: input.firstName,
            lastName: input.lastName,
            club: input.club,
            city: input.city,
            isProfileCompleted: true
        });
    }

    getAccess(): Promise<UserAccess> {
        return Promise.resolve({
            isAdmin: true,
            isManager: true
        });
    }
}

export function createProfileRepository(): ProfileRepository {
    return apiConfig.mockMode ? new StaticProfileRepository() : new ApiProfileRepository();
}
