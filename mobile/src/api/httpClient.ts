import { apiConfig } from './config';

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiConfig.baseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}
