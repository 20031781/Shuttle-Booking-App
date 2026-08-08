import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {UserProfile} from '@/types/domain';

const getJsonAuthMock = vi.fn();
const putJsonAuthMock = vi.fn();
const cacheUserProfileMock = vi.fn(async () => undefined);
const getCachedUserProfileMock = vi.fn(async (): Promise<UserProfile | null> => null);
const isNetworkRequestErrorMock = vi.fn(() => false);

vi.mock('./httpClient', () => ({
    getJsonAuth: getJsonAuthMock,
    putJsonAuth: putJsonAuthMock
}));

vi.mock('./authSession', () => ({
    cacheUserProfile: cacheUserProfileMock,
    getCachedUserProfile: getCachedUserProfileMock,
    isNetworkRequestError: isNetworkRequestErrorMock
}));

vi.mock('./config', () => ({
    apiConfig: {mockMode: false}
}));

function userApiResponse(overrides?: Partial<{
    email: string;
    firstName: string;
    lastName: string;
    city: string;
    username: string | null;
    club: string | null;
    isProfileCompleted: boolean;
}>) {
    return {
        email: 'lorenzo@test.it',
        firstName: 'Lorenzo',
        lastName: 'Appetito',
        city: 'Roma',
        username: 'lorenzo',
        club: 'Shuttle Club',
        isProfileCompleted: true,
        ...overrides
    };
}

describe('ApiProfileRepository.get', () => {
    beforeEach(() => {
        getJsonAuthMock.mockReset();
        putJsonAuthMock.mockReset();
        cacheUserProfileMock.mockClear();
        getCachedUserProfileMock.mockReset().mockResolvedValue(null);
        isNetworkRequestErrorMock.mockReset().mockReturnValue(false);
    });

    it('azzera city quando il profilo non è completato', async () => {
        getJsonAuthMock.mockResolvedValueOnce(userApiResponse({isProfileCompleted: false, city: 'Roma'}));

        const {ApiProfileRepository} = await import('./profileRepository');
        const profile = await new ApiProfileRepository().get();

        expect(profile.city).toBe('');
        expect(profile.isProfileCompleted).toBe(false);
    });

    it('mantiene city quando il profilo è completato e sostituisce club/username null con stringa vuota', async () => {
        getJsonAuthMock.mockResolvedValueOnce(userApiResponse({club: null, username: null}));

        const {ApiProfileRepository} = await import('./profileRepository');
        const profile = await new ApiProfileRepository().get();

        expect(profile.city).toBe('Roma');
        expect(profile.club).toBe('');
        expect(profile.username).toBe('');
    });

    it('usa il profilo in cache quando la richiesta fallisce per errore di rete', async () => {
        const cached = {
            firstName: 'Cache',
            lastName: 'Utente',
            email: 'cache@test.it',
            city: 'Milano',
            club: 'Club',
            username: 'cache',
            isProfileCompleted: true
        };
        getJsonAuthMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        isNetworkRequestErrorMock.mockReturnValue(true);
        getCachedUserProfileMock.mockResolvedValueOnce(cached);

        const {ApiProfileRepository} = await import('./profileRepository');
        const profile = await new ApiProfileRepository().get();

        expect(profile).toEqual(cached);
    });
});
