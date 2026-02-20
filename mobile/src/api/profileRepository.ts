import type { UserProfile } from '../types/domain';
import { apiConfig } from './config';
import { getJson } from './httpClient';

export interface ProfileRepository {
  get(): Promise<UserProfile>;
}

type UserApiResponse = {
  email: string;
  firstName: string;
  lastName: string;
  city: string;
};

const fallbackProfile: UserProfile = {
  fullName: 'Utente Demo',
  email: 'demo@shuttlebooking.app',
  company: 'Shuttle Booking'
};

export class ApiProfileRepository implements ProfileRepository {
  async get(): Promise<UserProfile> {
    const user = await getJson<UserApiResponse>(`/User/byEmail/${encodeURIComponent(apiConfig.profileEmail)}`);

    return {
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      email: user.email,
      company: user.city
    };
  }
}

export class StaticProfileRepository implements ProfileRepository {
  async get(): Promise<UserProfile> {
    return fallbackProfile;
  }
}

export function createProfileRepository(): ProfileRepository {
  return apiConfig.mockMode ? new StaticProfileRepository() : new ApiProfileRepository();
}
