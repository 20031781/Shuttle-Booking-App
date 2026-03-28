import type {UserProfile} from '../types/domain';
import {t} from '../i18n';
import {apiConfig} from './config';
import {getJsonAuth} from './httpClient';

export interface ProfileRepository {
    get(): Promise<UserProfile>;
}

type UserApiResponse = {
    email: string;
    firstName: string;
    lastName: string;
    city: string;
};

const fallbackProfile: UserProfile = {
    fullName: t.profile.fallback.fullName,
    email: t.profile.fallback.email,
    company: t.profile.fallback.company
};

export class ApiProfileRepository implements ProfileRepository {
    async get(): Promise<UserProfile> {
        const user = await getJsonAuth<UserApiResponse>('/User/Me');

        return {
            fullName: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
            company: user.city
        };
    }
}

export class StaticProfileRepository implements ProfileRepository {
    async get(): Promise<UserProfile> {
        return fallbackProfile;
    }
}

export function createProfileRepository(): ProfileRepository {
    return apiConfig.mockMode ? new StaticProfileRepository() : new ApiProfileRepository();
}
