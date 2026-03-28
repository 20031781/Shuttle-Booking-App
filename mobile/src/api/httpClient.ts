import {t} from '../i18n';
import {getAccessToken, refreshAccessToken} from './authSession';
import {apiConfig} from './config';

const requestTimeoutMs = 10_000;

type ApiErrorResponse = {
    message?: string;
    error?: string;
};

type RequestOptions = {
    requiresAuth?: boolean;
    allowRefreshRetry?: boolean;
};

export class HttpError extends Error {
    statusCode: number;

    constructor(statusCode: number, message: string) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
    }
}

function createAbortController() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    return {controller, timeout};
}

async function extractErrorMessage(response: Response): Promise<string> {
    try {
        const data = await response.json() as ApiErrorResponse;
        if (typeof data.message === 'string' && data.message.length > 0) {
            return data.message;
        }

        if (typeof data.error === 'string' && data.error.length > 0) {
            return data.error;
        }
    } catch {
        // No-op: fallback al messaggio generico.
    }

    return t.api.requestFailed(response.status);
}

async function parseJson<T>(response: Response): Promise<T> {
    if (response.status === 204) {
        return undefined as T;
    }

    const raw = await response.text();
    if (!raw) {
        return undefined as T;
    }

    return JSON.parse(raw) as T;
}

async function executeRequest(path: string, init: RequestInit, accessToken?: string): Promise<Response> {
    const headers = new Headers(init.headers ?? {});
    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(`${apiConfig.baseUrl}${path}`, {
        ...init,
        headers
    });
}

async function requestJson<T>(path: string, init?: RequestInit, options?: RequestOptions): Promise<T> {
    const requiresAuth = options?.requiresAuth ?? false;
    const allowRefreshRetry = options?.allowRefreshRetry ?? true;
    const {controller, timeout} = createAbortController();

    try {
        const accessToken = requiresAuth ? await getAccessToken() : undefined;

        const response = await executeRequest(path, {signal: controller.signal, ...init}, accessToken);
        if (response.status === 401 && requiresAuth && allowRefreshRetry) {
            const refreshed = await refreshAccessToken();
            const retriedResponse = await executeRequest(
                path,
                {signal: controller.signal, ...init},
                refreshed.accessToken
            );

            if (!retriedResponse.ok) {
                throw new HttpError(retriedResponse.status, await extractErrorMessage(retriedResponse));
            }

            return await parseJson<T>(retriedResponse);
        }

        if (!response.ok) {
            throw new HttpError(response.status, await extractErrorMessage(response));
        }

        return await parseJson<T>(response);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(t.api.requestTimeout);
        }

        if (error instanceof Error) {
            const isNetworkError =
                error instanceof TypeError || /network request failed|failed to fetch/i.test(error.message);

            if (isNetworkError) {
                throw new Error(t.api.networkUnavailable(apiConfig.baseUrl));
            }
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function getJson<T>(path: string): Promise<T> {
    return requestJson<T>(path);
}

export async function getJsonAuth<T>(path: string): Promise<T> {
    return requestJson<T>(path, undefined, {requiresAuth: true});
}

export async function postJson<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
    return requestJson<TResponse>(path, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

export async function postJsonAuth<TRequest, TResponse>(
    path: string,
    body: TRequest,
    headers?: HeadersInit
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(headers ?? {})
            },
            body: JSON.stringify(body)
        },
        {requiresAuth: true}
    );
}

export async function putJson<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
    return requestJson<TResponse>(path, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

export async function putJsonAuth<TRequest, TResponse>(
    path: string,
    body?: TRequest,
    headers?: HeadersInit
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'PUT',
            headers: {
                ...(body ? {'Content-Type': 'application/json'} : {}),
                ...(headers ?? {})
            },
            ...(body ? {body: JSON.stringify(body)} : {})
        },
        {requiresAuth: true}
    );
}
