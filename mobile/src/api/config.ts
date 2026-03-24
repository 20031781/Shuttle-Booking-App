const defaultApiBaseUrl = 'http://localhost:5000';

function normalizeBaseUrl(rawBaseUrl: string): string {
  return rawBaseUrl.replace(/\/+$/, '');
}

export const apiConfig = {
  baseUrl: normalizeBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl),
  profileEmail: process.env.EXPO_PUBLIC_PROFILE_EMAIL ?? 'demo@shuttlebooking.app',
  mockMode: process.env.EXPO_PUBLIC_MOCK_MODE === 'true'
};
