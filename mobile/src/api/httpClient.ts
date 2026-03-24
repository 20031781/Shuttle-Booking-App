import { apiConfig } from './config';

const requestTimeoutMs = 10_000;

type ApiErrorResponse = {
  message?: string;
  error?: string;
};

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

  return `Request failed: ${response.status}`;
}

export async function getJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('La richiesta al server ha superato il tempo massimo di attesa.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
