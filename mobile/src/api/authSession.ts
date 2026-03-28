import {t} from '../i18n';
import {apiConfig} from './config';

type LoginApiResponse = {
    token: string;
    expiration: string;
    refreshToken: string;
    refreshTokenExpiration: string;
};

type RegisterUserRequest = {
    email: string;
    firstName: string;
    lastName: string;
    authProvider: string;
    password: string;
    phoneCountryCode: string;
    city: string;
};

type SessionListener = (isAuthenticated: boolean) => void;

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

const requestTimeoutMs = 10_000;
const expirySkewMs = 30_000;

let session: AuthSession | null = null;
let pendingRefreshPromise: Promise<AuthSession> | null = null;
const listeners = new Set<SessionListener>();

function notifySessionChanged() {
    const authenticated = hasActiveSession();
    listeners.forEach(listener => listener(authenticated));
}

function setSession(nextSession: AuthSession | null) {
    session = nextSession;
    notifySessionChanged();
}

function createAbortController() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    return {controller, timeout};
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function isExpired(expiresAtIso: string): boolean {
    const expiresAtMs = Date.parse(expiresAtIso);
    if (Number.isNaN(expiresAtMs)) {
        return true;
    }

    return expiresAtMs - Date.now() <= expirySkewMs;
}

function toSession(payload: LoginApiResponse): AuthSession {
    return {
        accessToken: payload.token,
        accessTokenExpiration: payload.expiration,
        refreshToken: payload.refreshToken,
        refreshTokenExpiration: payload.refreshTokenExpiration
    };
}

function buildDefaultRegisterPayload(email: string, password: string): RegisterUserRequest {
    const prefix = email.split('@')[0] || t.mock.user.firstNameFallback.toLowerCase();
    const normalized = prefix.replace(/[^a-zA-Z]/g, '');
    const firstName = normalized.length > 0 ? normalized : t.mock.user.firstNameFallback;

    return {
        email,
        firstName,
        lastName: t.mock.user.lastName,
        authProvider: 'App',
        password,
        phoneCountryCode: '+39',
        city: t.mock.user.city
    };
}

function mapRequestError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error && error.name === 'AbortError') {
        return new Error(t.api.requestTimeout);
    }

    if (error instanceof TypeError) {
        return new Error(t.api.networkUnavailable(apiConfig.baseUrl));
    }

    if (error instanceof Error) {
        return error;
    }

    return new Error(fallbackMessage);
}

async function parseErrorMessage(response: Response): Promise<string> {
    try {
        const data = await response.json() as { message?: string };
        if (typeof data.message === 'string' && data.message.length > 0) {
            return data.message;
        }
    } catch {
        // Ignore and fallback
    }

    return t.api.requestFailed(response.status);
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

        if (!response.ok) {
            throw new Error(await parseErrorMessage(response));
        }

        const payload = await response.json() as LoginApiResponse;
        const currentSession = toSession(payload);
        setSession(currentSession);
        return currentSession;
    } catch (error) {
        throw mapRequestError(error, t.auth.loginFailed);
    } finally {
        clearTimeout(timeout);
    }
}

export function subscribeToSessionChanges(listener: SessionListener): () => void {
    listeners.add(listener);
    listener(hasActiveSession());

    return () => listeners.delete(listener);
}

export function hasActiveSession(): boolean {
    if (!session) {
        return false;
    }

    return !isExpired(session.accessTokenExpiration) || !isExpired(session.refreshTokenExpiration);
}

export async function registerWithPassword(credentials: PasswordCredentials): Promise<void> {
    const email = normalizeEmail(credentials.email);
    const {controller, timeout} = createAbortController();

    try {
        const registerResponse = await fetch(`${apiConfig.baseUrl}/User/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(buildDefaultRegisterPayload(email, credentials.password)),
            signal: controller.signal
        });

        if (!registerResponse.ok) {
            throw new Error(await parseErrorMessage(registerResponse));
        }
    } catch (error) {
        throw mapRequestError(error, t.auth.loginFailed);
    } finally {
        clearTimeout(timeout);
    }

    await loginWithPassword(credentials);
}

export async function loginWithPassword(credentials: PasswordCredentials): Promise<void> {
    await submitLoginRequest('/User/Login', {
        email: normalizeEmail(credentials.email),
        password: credentials.password
    });
}

export async function loginWithGoogle(email: string, googleToken: string): Promise<void> {
    await submitLoginRequest('/User/LoginWithGoogle', {
        email: normalizeEmail(email),
        googleToken
    });
}

async function refreshSession(): Promise<AuthSession> {
    if (!session?.refreshToken || isExpired(session.refreshTokenExpiration)) {
        setSession(null);
        throw new Error(t.api.authRequired);
    }

    const {controller, timeout} = createAbortController();
    try {
        const response = await fetch(`${apiConfig.baseUrl}/User/RefreshToken`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken: session.refreshToken
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            setSession(null);
            throw new Error(await parseErrorMessage(response));
        }

        const payload = await response.json() as LoginApiResponse;
        const refreshed = toSession(payload);
        setSession(refreshed);
        return refreshed;
    } catch (error) {
        throw mapRequestError(error, t.api.authRequired);
    } finally {
        clearTimeout(timeout);
    }
}

async function ensureSession(): Promise<AuthSession> {
    if (!session) {
        throw new Error(t.api.authRequired);
    }

    if (!isExpired(session.accessTokenExpiration)) {
        return session;
    }

    if (isExpired(session.refreshTokenExpiration)) {
        setSession(null);
        throw new Error(t.api.authRequired);
    }

    return refreshAccessToken();
}

export async function getAccessToken(): Promise<string> {
    const current = await ensureSession();
    return current.accessToken;
}

export async function refreshAccessToken(): Promise<AuthSession> {
    if (!pendingRefreshPromise) {
        pendingRefreshPromise = refreshSession().finally(() => {
            pendingRefreshPromise = null;
        });
    }

    return pendingRefreshPromise;
}

export async function logoutCurrentSession(): Promise<void> {
    if (!session) {
        return;
    }

    let accessToken = session.accessToken;
    if (isExpired(session.accessTokenExpiration) && !isExpired(session.refreshTokenExpiration)) {
        accessToken = (await refreshAccessToken()).accessToken;
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
        setSession(null);
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
            throw new Error(await parseErrorMessage(response));
        }
    } catch (error) {
        throw mapRequestError(error, t.api.requestFailed(500));
    } finally {
        clearTimeout(timeout);
    }
}
