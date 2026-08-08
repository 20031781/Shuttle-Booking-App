import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {UserProfile} from '@/types/domain';
import type {StoredSessionTokens} from './sessionStorage';

const storageState = vi.hoisted(() => ({
    tokens: null as StoredSessionTokens | null,
    user: null as UserProfile | null
}));

const networkState = vi.hoisted(() => ({
    online: true
}));

vi.mock('./config', () => ({
    apiConfig: {
        baseUrl: 'http://localhost:5000'
    }
}));

vi.mock('./networkStatus', () => ({
    isNetworkOnline: vi.fn(async () => networkState.online),
    subscribeToNetworkChanges: vi.fn(() => () => undefined)
}));

vi.mock('./sessionStorage', () => ({
    loadStoredSessionTokens: vi.fn(async () => storageState.tokens),
    saveStoredSessionTokens: vi.fn(async (tokens: StoredSessionTokens) => {
        storageState.tokens = tokens;
    }),
    clearStoredSessionTokens: vi.fn(async () => {
        storageState.tokens = null;
    }),
    loadStoredSessionUser: vi.fn(async () => storageState.user),
    saveStoredSessionUser: vi.fn(async (user: UserProfile) => {
        storageState.user = user;
    }),
    clearStoredSessionUser: vi.fn(async () => {
        storageState.user = null;
    })
}));

function createUser(overrides?: Partial<UserProfile>): UserProfile {
    return {
        firstName: 'Lorenzo',
        lastName: 'Appetito',
        email: 'lorenzo@test.it',
        city: 'Roma',
        club: 'Shuttle Club',
        username: 'lorenzo',
        isProfileCompleted: true,
        ...overrides
    };
}

function createExpiredAccessTokens(): StoredSessionTokens {
    return {
        accessToken: 'expired-access',
        accessTokenExpiration: new Date(Date.now() - 5 * 60_000).toISOString(),
        refreshToken: 'refresh-valid',
        refreshTokenExpiration: new Date(Date.now() + 24 * 60 * 60_000).toISOString()
    };
}

function createRefreshPayload(overrides?: Partial<{
    token: string;
    expiration: string;
    refreshToken: string;
    refreshTokenExpiration: string;
    user: Partial<UserProfile>;
}>): object {
    return {
        token: overrides?.token ?? 'new-access-token',
        expiration: overrides?.expiration ?? new Date(Date.now() + 20 * 60_000).toISOString(),
        refreshToken: overrides?.refreshToken ?? 'new-refresh-token',
        refreshTokenExpiration:
            overrides?.refreshTokenExpiration ?? new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString(),
        user: {
            email: overrides?.user?.email ?? 'lorenzo@test.it',
            firstName: overrides?.user?.firstName ?? 'Lorenzo',
            lastName: overrides?.user?.lastName ?? 'Appetito',
            city: overrides?.user?.city ?? 'Roma',
            club: overrides?.user?.club ?? 'Shuttle Club',
            username: overrides?.user?.username ?? 'lorenzo',
            isProfileCompleted: overrides?.user?.isProfileCompleted ?? true
        }
    };
}

function createJsonResponse(body: object, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}

async function loadAuthSessionModule() {
    vi.resetModules();
    const authSession = await import('./authSession');
    await authSession.__resetSessionForTests();
    return authSession;
}

describe('authSession recovery', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        storageState.tokens = null;
        storageState.user = null;
        networkState.online = true;
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('mantiene sessione offline con utente cache quando token assenti e rete offline', async () => {
        storageState.user = createUser();
        networkState.online = false;

        const authSession = await loadAuthSessionModule();
        const snapshot = await authSession.initializeSessionOnAppStart();

        expect(snapshot.isAuthenticated).toBe(true);
        expect(snapshot.isOfflineMode).toBe(true);
        expect(snapshot.requiresRelogin).toBe(false);
    });

    it('richiede relogin con pulizia sessione quando token assenti e rete online', async () => {
        storageState.user = createUser();
        networkState.online = true;

        const authSession = await loadAuthSessionModule();
        const snapshot = await authSession.initializeSessionOnAppStart();

        expect(snapshot.isAuthenticated).toBe(false);
        expect(snapshot.requiresRelogin).toBe(true);
        expect(storageState.user).toBeNull();
        expect(storageState.tokens).toBeNull();
    });

    it('fa fallback offline quando refresh fallisce per rete', async () => {
        storageState.user = createUser();
        storageState.tokens = createExpiredAccessTokens();
        networkState.online = true;
        fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

        const authSession = await loadAuthSessionModule();
        const snapshot = await authSession.initializeSessionOnAppStart();

        expect(snapshot.isAuthenticated).toBe(true);
        expect(snapshot.isOfflineMode).toBe(true);
        expect(snapshot.requiresRelogin).toBe(false);
    });

    it('forza relogin e pulizia quando refresh fallisce per errore auth', async () => {
        storageState.user = createUser();
        storageState.tokens = createExpiredAccessTokens();
        networkState.online = true;
        fetchMock.mockResolvedValueOnce(createJsonResponse({message: 'Refresh token non valido.'}, 401));

        const authSession = await loadAuthSessionModule();
        const snapshot = await authSession.initializeSessionOnAppStart();

        expect(snapshot.isAuthenticated).toBe(false);
        expect(snapshot.requiresRelogin).toBe(true);
        expect(storageState.user).toBeNull();
        expect(storageState.tokens).toBeNull();
    });

    it('aggiorna e persiste token/utente quando refresh riesce', async () => {
        storageState.user = createUser({firstName: 'Old'});
        storageState.tokens = createExpiredAccessTokens();
        networkState.online = true;
        fetchMock.mockResolvedValueOnce(createJsonResponse(createRefreshPayload({
            user: {
                firstName: 'NuovoNome'
            }
        }), 200));

        const authSession = await loadAuthSessionModule();
        const snapshot = await authSession.initializeSessionOnAppStart();

        expect(snapshot.isAuthenticated).toBe(true);
        expect(snapshot.isOfflineMode).toBe(false);
        expect(snapshot.user?.firstName).toBe('NuovoNome');
        expect(storageState.tokens?.accessToken).toBe('new-access-token');
        expect(storageState.tokens?.refreshToken).toBe('new-refresh-token');
        expect(storageState.user?.firstName).toBe('NuovoNome');
    });

    it('esegue una sola chiamata refresh in recovery concorrente', async () => {
        storageState.user = createUser();
        storageState.tokens = createExpiredAccessTokens();
        networkState.online = false;

        const authSession = await loadAuthSessionModule();
        await authSession.initializeSessionOnAppStart();

        networkState.online = true;
        fetchMock.mockImplementationOnce(
            async () => new Promise(resolve => setTimeout(() => resolve(createJsonResponse(createRefreshPayload(), 200)), 20))
        );

        await Promise.all([
            authSession.recoverSessionIfPossible(),
            authSession.recoverSessionIfPossible(),
            authSession.recoverSessionIfPossible()
        ]);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
