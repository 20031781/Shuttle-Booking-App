const defaultApiBaseUrl = 'http://localhost:5256';

export const apiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl,
  profileEmail: process.env.EXPO_PUBLIC_PROFILE_EMAIL ?? 'demo@shuttlebooking.app',
  mockMode: process.env.EXPO_PUBLIC_MOCK_MODE === 'true'
};
