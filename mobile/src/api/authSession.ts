import type {z} from 'zod';

import {t} from '@/i18n';
import googleSignInService from '@/services/google-signin.service';
import type {UserProfile} from '@/types/domain';
import {apiConfig} from './config';
import {setApiReachable} from './apiStatus';
import {loginApiSchema} from './schemas';
import {isNetworkOnline} from './networkStatus';
import {
    clearStoredSessionTokens,
    clearStoredSessionUser,
    loadStoredSessionTokens,
    loadStoredSessionUser,
    saveStoredSessionTokens,
    saveStoredSessionUser,
    type StoredSessionTokens
} from './sessionStorage';

type LoginApiResponse = z.infer<typeof loginApiSchema>;

type UserApiResponse = LoginApiResponse['user'];

/**
 * Valida la risposta di autenticazione prima di fidarsene: è il payload da cui
 * derivano token e identità, quindi una forma inattesa deve fallire subito e in
 * modo esplicito invece di propagare campi mancanti dentro la sessione.
 */
function parseLoginPayload(raw: unknown): LoginApiResponse {
    const result = loginApiSchema.safeParse(raw);
    if (!result.success) {
        throw new Error(t.auth.loginFailed);
    }

    return result.data;
}

type RegisterUserRequest = {
    email: string;
    authProvider: string;
    password: string;
    phoneCountryCode: string;
};

type SessionState = {
    tokens: AuthSession | null;
    user: UserProfile | null;
    isOfflineMode: boolean;
    requiresRelogin: boolean;
    reloginMessage: string | null;
};

type SessionStateListener = (snapshot: SessionSnapshot) => void;

export type PasswordCredentials = {
    email: string;
    password: string;
};

export type AuthSession = {
    accessToken: string;
    accessTokenExpiration: string;
    refreshToken: string;
    refreshTokenExpiration: string;
};

export type SessionSnapshot = {
    isAuthenticated: boolean;
    isOfflineMode: boolean;
    requiresRelogin: boolean;
    reloginMessage: string | null;
    user: UserProfile | null;
};

export class ReloginRequiredError extends Error {
    readonly code = 'RELOGIN_REQUIRED';

    constructor(message: string = t.auth.reloginRequired) {
        super(message);
        this.name = 'ReloginRequiredError';
    }
}

const requestTimeoutMs = 10_000;
const expirySkewMs = 30_000;

const initialSessionState: SessionState = {
    tokens: null,
    user: null,
    isOfflineMode: false,
    requiresRelogin: false,
    reloginMessage: null
};

let state: SessionState = {...initialSessionState};
let hasBootstrapped = false;
let pendingBootstrapPromise: Promise<SessionSnapshot> | null = null;
let pendingRefreshPromise: Promise<AuthSession> | null = null;
let pendingRecoveryPromise: Promise<SessionSnapshot> | null = null;

const sessionStateListeners = new Set<SessionStateListener>();

function createAbortController() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    return {controller, timeout};
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function isTokenExpired(expiresAtIso: string): boolean {
    const expiresAtMs = Date.parse(expiresAtIso);
    if (Number.isNaN(expiresAtMs)) {
        return true;
    }

    return expiresAtMs - Date.now() <= expirySkewMs;
}

function isTokenPayloadValid(tokens: StoredSessionTokens | null): tokens is AuthSession {
    if (!tokens) {
        return false;
    }

    return typeof tokens.accessToken === 'string'
        && tokens.accessToken.length > 0
        && typeof tokens.accessTokenExpiration === 'string'
        && tokens.accessTokenExpiration.length > 0
        && typeof tokens.refreshToken === 'string'
        && tokens.refreshToken.length > 0
        && typeof tokens.refreshTokenExpiration === 'string'
        && tokens.refreshTokenExpiration.length > 0;
}

function normalizeUserProfile(user: UserProfile | null): UserProfile | null {
    if (!user) {
        return null;
    }

    if (typeof user.email !== 'string' || user.email.trim().length === 0) {
        return null;
    }

    return {
        firstName: typeof user.firstName === 'string' ? user.firstName : '',
        lastName: typeof user.lastName === 'string' ? user.lastName : '',
        email: user.email,
        city: typeof user.city === 'string' ? user.city : '',
        club: typeof user.club === 'string' ? user.club : '',
        username: typeof user.username === 'string' ? user.username : '',
        isProfileCompleted: Boolean(user.isProfileCompleted)
    };
}

function mapApiUserToProfile(user: UserApiResponse): UserProfile {
    return {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        city: user.city,
        club: user.club ?? '',
        username: user.username ?? '',
        isProfileCompleted: user.isProfileCompleted
    };
}

function mapApiSession(payload: LoginApiResponse): AuthSession {
    return {
        accessToken: payload.token,
        accessTokenExpiration: payload.expiration,
        refreshToken: payload.refreshToken,
        refreshTokenExpiration: payload.refreshTokenExpiration
    };
}

function buildDefaultRegisterPayload(email: string, password: string): RegisterUserRequest {
    return {
        email,
        authProvider: 'App',
        password,
        phoneCountryCode: '+39'
    };
}

function isAuthenticatedSnapshot(nextState: SessionState): boolean {
    if (!nextState.user) {
        return false;
    }

    return nextState.tokens != null || nextState.isOfflineMode;
}

function toSnapshot(nextState = state): SessionSnapshot {
    return {
        isAuthenticated: isAuthenticatedSnapshot(nextState),
        isOfflineMode: nextState.isOfflineMode,
        requiresRelogin: nextState.requiresRelogin,
        reloginMessage: nextState.reloginMessage,
        user: nextState.user
    };
}

function notifySessionChanged() {
    const snapshot = toSnapshot();
    sessionStateListeners.forEach(listener => listener(snapshot));
}

function setAuthenticatedRemote(nextTokens: AuthSession, nextUser: UserProfile) {
    state = {
        tokens: nextTokens,
        user: nextUser,
        isOfflineMode: false,
        requiresRelogin: false,
        reloginMessage: null
    };
    notifySessionChanged();
}

function setAuthenticatedOffline(nextUser: UserProfile, nextTokens: AuthSession | null) {
    state = {
        tokens: nextTokens,
        user: nextUser,
        isOfflineMode: true,
        requiresRelogin: false,
        reloginMessage: null
    };
    notifySessionChanged();
}

function setSignedOut(requiresRelogin: boolean, reloginMessage?: string) {
    state = {
        tokens: null,
        user: null,
        isOfflineMode: false,
        requiresRelogin,
        reloginMessage: requiresRelogin ? reloginMessage ?? t.auth.reloginRequired : null
    };
    notifySessionChanged();
}

async function persistSession(nextTokens: AuthSession, nextUser: UserProfile): Promise<void> {
    await Promise.all([saveStoredSessionTokens(nextTokens), saveStoredSessionUser(nextUser)]);
}

async function clearPersistedSession(): Promise<void> {
    await Promise.all([clearStoredSessionTokens(), clearStoredSessionUser()]);
}

async function isNetworkOnlineSafe(): Promise<boolean> {
    try {
        return await isNetworkOnline();
    } catch {
        return false;
    }
}

function mapRequestError(error: unknown, fallbackMessage: string): Error {
    if (isReloginRequiredError(error)) {
        return error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
        return new Error(t.api.requestTimeout);
    }

    if (isNetworkRequestError(error)) {
        return new Error(t.api.networkUnavailable(apiConfig.baseUrl));
    }

    if (error instanceof Error) {
        return error;
    }

    return new Error(fallbackMessage);
}

async function parseErrorMessage(response: Response): Promise<string> {
    try {
        const data = await response.json() as { message?: string; error?: string };
        if (typeof data.message === 'string' && data.message.length > 0) {
            return data.message;
        }

        if (typeof data.error === 'string' && data.error.length > 0) {
            return data.error;
        }
    } catch {
        // Ignore and fallback.
    }

    return t.api.requestFailed(response.status);
}

function isAuthTerminalStatus(statusCode: number): boolean {
    return statusCode === 401 || statusCode === 403;
}

async function saveAndApplyRemoteSession(nextSession: AuthSession, nextUser: UserProfile): Promise<void> {
    await persistSession(nextSession, nextUser);
    setAuthenticatedRemote(nextSession, nextUser);
}

function normalizeAuthPayload(payload: LoginApiResponse): {
    session: AuthSession;
    user: UserProfile;
} {
    const nextSession = mapApiSession(payload);
    if (!isTokenPayloadValid(nextSession)) {
        throw new Error(t.auth.loginFailed);
    }

    // Dopo `parseLoginPayload` il payload contiene sempre un utente valido:
    // non serve più un fallback all'utente in cache.
    return {session: nextSession, user: mapApiUserToProfile(payload.user)};
}

async function submitLoginRequest(path: string, body: object): Promise<AuthSession> {
    const {controller, timeout} = createAbortController();
    try {
        const response = await fetch(`${apiConfig.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });
        // Anche un 4xx/5xx dimostra che il backend è raggiungibile; solo gli
        // errori di trasporto devono attivare il banner API non disponibile.
        setApiReachable(true, 'response');

        if (!response.ok) {
            throw new Error(await parseErrorMessage(response));
        }

        const payload = parseLoginPayload(await response.json());
        const normalized = normalizeAuthPayload(payload);
        await saveAndApplyRemoteSession(normalized.session, normalized.user);
        return normalized.session;
    } catch (error) {
        if (isNetworkRequestError(error)) {
            setApiReachable(false, 'error');
        }
        throw mapRequestError(error, t.auth.loginFailed);
    } finally {
        clearTimeout(timeout);
    }
}

async function ensureBootstrapped(): Promise<void> {
    if (hasBootstrapped) {
        return;
    }

    await initializeSessionOnAppStart();
}

async function recoverSessionIfPossibleInternal(): Promise<SessionSnapshot> {
    const currentUser = state.user;
    const currentTokens = state.tokens;
    const isOnline = await isNetworkOnlineSafe();

    if (!currentUser) {
        if (currentTokens) {
            await clearStoredSessionTokens();
        }

        setSignedOut(false);
        return toSnapshot();
    }

    if (!currentTokens || !isTokenPayloadValid(currentTokens)) {
        if (isOnline) {
            await invalidateSessionForRelogin();
            return toSnapshot();
        }

        setAuthenticatedOffline(currentUser, null);
        return toSnapshot();
    }

    if (!isTokenExpired(currentTokens.accessTokenExpiration)) {
        if (isOnline) {
            setAuthenticatedRemote(currentTokens, currentUser);
            return toSnapshot();
        }

        setAuthenticatedOffline(currentUser, currentTokens);
        return toSnapshot();
    }

    if (isTokenExpired(currentTokens.refreshTokenExpiration)) {
        if (isOnline) {
            await invalidateSessionForRelogin();
            return toSnapshot();
        }

        setAuthenticatedOffline(currentUser, null);
        return toSnapshot();
    }

    if (!isOnline) {
        setAuthenticatedOffline(currentUser, currentTokens);
        return toSnapshot();
    }

    try {
        await refreshAccessToken();
        return toSnapshot();
    } catch (error) {
        if (isReloginRequiredError(error)) {
            return toSnapshot();
        }

        if (isNetworkRequestError(error)) {
            setAuthenticatedOffline(currentUser, currentTokens);
            return toSnapshot();
        }

        throw error;
    }
}

async function refreshSession(): Promise<AuthSession> {
    const currentTokens = state.tokens;
    const currentUser = state.user;

    if (!currentTokens?.refreshToken || isTokenExpired(currentTokens.refreshTokenExpiration)) {
        const isOnline = await isNetworkOnlineSafe();
        if (!isOnline && currentUser) {
            setAuthenticatedOffline(currentUser, null);
            throw new Error(t.api.networkUnavailable(apiConfig.baseUrl));
        }

        throw await invalidateSessionForRelogin();
    }

    const {controller, timeout} = createAbortController();
    try {
        const response = await fetch(`${apiConfig.baseUrl}/User/RefreshToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: currentTokens.refreshToken
            }),
            signal: controller.signal
        });
        setApiReachable(true, 'response');

        if (!response.ok) {
            if (isAuthTerminalStatus(response.status)) {
                throw await invalidateSessionForRelogin(await parseErrorMessage(response));
            }

            throw new Error(await parseErrorMessage(response));
        }

        const payload = parseLoginPayload(await response.json());
        const normalized = normalizeAuthPayload(payload);
        await saveAndApplyRemoteSession(normalized.session, normalized.user);
        return normalized.session;
    } catch (error) {
        if (isReloginRequiredError(error)) {
            throw error;
        }

        const mappedError = mapRequestError(error, t.api.authRequired);
        if (isNetworkRequestError(error) && currentUser) {
            setAuthenticatedOffline(currentUser, currentTokens);
            setApiReachable(false, 'error');
        }

        throw mappedError;
    } finally {
        clearTimeout(timeout);
    }
}

export function isReloginRequiredError(error: unknown): error is ReloginRequiredError {
    return error instanceof ReloginRequiredError;
}

export function isNetworkRequestError(error: unknown): boolean {
    if (error instanceof Error && error.name === 'AbortError') {
        return true;
    }

    if (error instanceof TypeError) {
        return true;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();
    return message.includes('network request failed')
        || message.includes('failed to fetch')
        || message.includes('network error')
        || message.includes(t.api.requestTimeout.toLowerCase())
        || message.includes('server non raggiungibile');
}

export function getSessionSnapshot(): SessionSnapshot {
    return toSnapshot();
}

export function subscribeToSessionState(listener: SessionStateListener): () => void {
    sessionStateListeners.add(listener);
    listener(toSnapshot());

    return () => sessionStateListeners.delete(listener);
}

export async function initializeSessionOnAppStart(): Promise<SessionSnapshot> {
    pendingBootstrapPromise ??= (async () => {
        const [storedTokens, storedUser] = await Promise.all([
            loadStoredSessionTokens(),
            loadStoredSessionUser()
        ]);

        state = {
            tokens: isTokenPayloadValid(storedTokens) ? storedTokens : null,
            user: normalizeUserProfile(storedUser),
            isOfflineMode: false,
            requiresRelogin: false,
            reloginMessage: null
        };
        notifySessionChanged();
        hasBootstrapped = true;

        return recoverSessionIfPossibleInternal();
    })()
        .catch(async () => {
            hasBootstrapped = true;
            await clearPersistedSession();
            setSignedOut(false);
            return toSnapshot();
        })
        .finally(() => {
            pendingBootstrapPromise = null;
        });

    return pendingBootstrapPromise;
}

export async function recoverSessionIfPossible(): Promise<SessionSnapshot> {
    await ensureBootstrapped();

    pendingRecoveryPromise ??= recoverSessionIfPossibleInternal().finally(() => {
        pendingRecoveryPromise = null;
    });

    return pendingRecoveryPromise;
}

export async function invalidateSessionForRelogin(message?: string): Promise<ReloginRequiredError> {
    await clearPersistedSession();
    setSignedOut(true, message);
    return new ReloginRequiredError(message);
}

export async function registerWithPassword(credentials: PasswordCredentials): Promise<void> {
    await submitLoginRequest('/User/register', buildDefaultRegisterPayload(
        normalizeEmail(credentials.email),
        credentials.password
    ));
}

export async function loginWithPassword(credentials: PasswordCredentials): Promise<void> {
    await submitLoginRequest('/User/Login', {
        email: normalizeEmail(credentials.email),
        password: credentials.password
    });
}

export async function loginWithGoogle(idToken: string): Promise<void> {
    await submitLoginRequest('/User/LoginWithGoogle', {
        idToken
    });
}

export async function getAccessToken(): Promise<string> {
    await ensureBootstrapped();

    const currentTokens = state.tokens;
    const currentUser = state.user;

    if (!currentUser) {
        throw await invalidateSessionForRelogin();
    }

    if (!currentTokens) {
        const isOnline = await isNetworkOnlineSafe();
        if (isOnline) {
            throw await invalidateSessionForRelogin();
        }

        setAuthenticatedOffline(currentUser, null);
        throw new Error(t.api.networkUnavailable(apiConfig.baseUrl));
    }

    if (!isTokenExpired(currentTokens.accessTokenExpiration)) {
        return currentTokens.accessToken;
    }

    if (isTokenExpired(currentTokens.refreshTokenExpiration)) {
        const isOnline = await isNetworkOnlineSafe();
        if (isOnline) {
            throw await invalidateSessionForRelogin();
        }

        setAuthenticatedOffline(currentUser, null);
        throw new Error(t.api.networkUnavailable(apiConfig.baseUrl));
    }

    const refreshed = await refreshAccessToken();
    return refreshed.accessToken;
}

export async function refreshAccessToken(): Promise<AuthSession> {
    await ensureBootstrapped();

    pendingRefreshPromise ??= refreshSession().finally(() => {
        pendingRefreshPromise = null;
    });

    return pendingRefreshPromise;
}

export async function logoutCurrentSession(): Promise<void> {
    await ensureBootstrapped();

    const currentTokens = state.tokens;

    try {
        if (!currentTokens) {
            return;
        }

        let accessToken = currentTokens.accessToken;
        if (isTokenExpired(currentTokens.accessTokenExpiration) && !isTokenExpired(currentTokens.refreshTokenExpiration)) {
            try {
                accessToken = (await refreshAccessToken()).accessToken;
            } catch {
                accessToken = currentTokens.accessToken;
            }
        }

        const {controller, timeout} = createAbortController();
        try {
            await fetch(`${apiConfig.baseUrl}/User/Logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }
    } finally {
        await clearPersistedSession();
        setSignedOut(false);
        // Mantiene l'uscita coerente anche con Google: il picker esplicito
        // resta disponibile per scegliere subito un altro account al login.
        void googleSignInService.signOut();
    }
}

export async function registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
    const accessToken = await getAccessToken();
    const {controller, timeout} = createAbortController();

    try {
        const response = await fetch(`${apiConfig.baseUrl}/User/DeviceToken`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                platform
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            if (isAuthTerminalStatus(response.status)) {
                throw await invalidateSessionForRelogin(await parseErrorMessage(response));
            }

            throw new Error(await parseErrorMessage(response));
        }
    } catch (error) {
        throw mapRequestError(error, t.api.requestFailed(500));
    } finally {
        clearTimeout(timeout);
    }
}

export async function cacheUserProfile(profile: UserProfile): Promise<void> {
    const normalizedUser = normalizeUserProfile(profile);
    if (!normalizedUser) {
        return;
    }

    state = {
        ...state,
        user: normalizedUser
    };
    notifySessionChanged();

    await saveStoredSessionUser(normalizedUser);
}

export async function getCachedUserProfile(): Promise<UserProfile | null> {
    if (state.user) {
        return state.user;
    }

    const storedUser = normalizeUserProfile(await loadStoredSessionUser());
    if (storedUser) {
        state = {
            ...state,
            user: storedUser
        };
    }

    return storedUser;
}

export function __resetSessionForTests(): Promise<void> {
    state = {...initialSessionState};
    hasBootstrapped = false;
    pendingBootstrapPromise = null;
    pendingRefreshPromise = null;
    pendingRecoveryPromise = null;
    sessionStateListeners.clear();

    return Promise.resolve();
}
