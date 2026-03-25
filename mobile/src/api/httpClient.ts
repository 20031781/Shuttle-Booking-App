import { apiConfig } from './config';
import { t } from '../i18n';

const requestTimeoutMs = 10_000;

type ApiErrorResponse = {
  message?: string;
  error?: string;
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
  return { controller, timeout };
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const { controller, timeout } = createAbortController();

  try {
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      signal: controller.signal,
      ...init
    });

    if (!response.ok) {
      throw new HttpError(response.status, await extractErrorMessage(response));
    }

    return await parseJson<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(t.api.requestTimeout);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getJson<T>(path: string): Promise<T> {
  return requestJson<T>(path);
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

export async function putJson<TRequest, TResponse>(path: string, body: TRequest): Promise<TResponse> {
  return requestJson<TResponse>(path, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}
