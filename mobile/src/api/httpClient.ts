import type {ZodType} from 'zod';

import {t} from '@/i18n';
import {isNetworkError} from '@/lib/offline';
import {setApiReachable} from './apiStatus';
import {getAccessToken, invalidateSessionForRelogin, isReloginRequiredError, refreshAccessToken} from './authSession';
import {apiConfig} from './config';

// Richieste JSON normali: se il backend è irraggiungibile non ha senso far
// aspettare l'utente a lungo prima che scatti il messaggio di rete.
const requestTimeoutMs = 8_000;
// Endpoint che aggregano dati (es. la dashboard admin) meritano più margine.
export const heavyRequestTimeoutMs = 30_000;

type ApiErrorResponse = {
    message?: string;
    error?: string;
};

export type RequestConfig<T> = {
    schema?: ZodType<T>;
    timeoutMs?: number;
    headers?: HeadersInit;
};

type InternalOptions<T> = RequestConfig<T> & {
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

export class InvalidApiResponseError extends Error {
    constructor(path: string, details: string) {
        super(t.api.invalidResponse(path));
        this.name = 'InvalidApiResponseError';
        this.cause = details;
    }
}

function createAbortController(timeoutMs: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

async function parseJson<T>(response: Response, path: string, schema?: ZodType<T>): Promise<T> {
    if (response.status === 204) {
        return undefined as T;
    }

    const raw = await response.text();
    if (!raw) {
        return undefined as T;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!schema) {
        return parsed as T;
    }

    const result = schema.safeParse(parsed);
    if (!result.success) {
        throw new InvalidApiResponseError(path, JSON.stringify(result.error.issues));
    }

    return result.data;
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

async function requestJson<T>(path: string, init?: RequestInit, options?: InternalOptions<T>): Promise<T> {
    const requiresAuth = options?.requiresAuth ?? false;
    const allowRefreshRetry = options?.allowRefreshRetry ?? true;
    const schema = options?.schema;
    const {controller, timeout} = createAbortController(options?.timeoutMs ?? requestTimeoutMs);

    try {
        const accessToken = requiresAuth ? await getAccessToken() : undefined;

        const response = await executeRequest(path, {signal: controller.signal, ...init}, accessToken);
        // Qualunque risposta HTTP, anche di errore, dimostra che il backend è vivo.
        setApiReachable(true, 'response');

        if (response.status === 401 && requiresAuth && allowRefreshRetry) {
            const refreshed = await refreshAccessToken();
            const retriedResponse = await executeRequest(
                path,
                {signal: controller.signal, ...init},
                refreshed.accessToken
            );

            if (retriedResponse.status === 401) {
                throw await invalidateSessionForRelogin();
            }

            if (!retriedResponse.ok) {
                throw new HttpError(retriedResponse.status, await extractErrorMessage(retriedResponse));
            }

            return await parseJson<T>(retriedResponse, path, schema);
        }

        if (response.status === 401 && requiresAuth) {
            throw await invalidateSessionForRelogin();
        }

        if (!response.ok) {
            throw new HttpError(response.status, await extractErrorMessage(response));
        }

        return await parseJson<T>(response, path, schema);
    } catch (error) {
        if (isReloginRequiredError(error)) {
            throw error;
        }

        if (error instanceof InvalidApiResponseError || error instanceof HttpError) {
            throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
            setApiReachable(false, 'error');
            throw new Error(t.api.requestTimeout);
        }

        if (isNetworkError(error)) {
            setApiReachable(false, 'error');
            throw new Error(t.api.networkUnavailable(apiConfig.baseUrl));
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export async function getJson<T>(path: string, config?: RequestConfig<T>): Promise<T> {
    return requestJson<T>(path, undefined, config);
}

export async function getJsonAuth<T>(path: string, config?: RequestConfig<T>): Promise<T> {
    return requestJson<T>(path, undefined, {...config, requiresAuth: true});
}

export async function postJson<TRequest, TResponse>(
    path: string,
    body: TRequest,
    config?: RequestConfig<TResponse>
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config?.headers ?? {})
            },
            body: JSON.stringify(body)
        },
        config
    );
}

export async function postJsonAuth<TRequest, TResponse>(
    path: string,
    body: TRequest,
    config?: RequestConfig<TResponse>
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(config?.headers ?? {})
            },
            body: JSON.stringify(body)
        },
        {...config, requiresAuth: true}
    );
}

export async function putJson<TRequest, TResponse>(
    path: string,
    body: TRequest,
    config?: RequestConfig<TResponse>
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...(config?.headers ?? {})
            },
            body: JSON.stringify(body)
        },
        config
    );
}

export async function putJsonAuth<TRequest, TResponse>(
    path: string,
    body?: TRequest,
    config?: RequestConfig<TResponse>
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'PUT',
            headers: {
                ...(body ? {'Content-Type': 'application/json'} : {}),
                ...(config?.headers ?? {})
            },
            ...(body ? {body: JSON.stringify(body)} : {})
        },
        {...config, requiresAuth: true}
    );
}

export async function deleteJsonAuth<TResponse>(
    path: string,
    config?: RequestConfig<TResponse>
): Promise<TResponse> {
    return requestJson<TResponse>(
        path,
        {
            method: 'DELETE'
        },
        {...config, requiresAuth: true}
    );
}
