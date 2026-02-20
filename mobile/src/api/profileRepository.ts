import type { UserProfile } from '../types/domain';

export interface ProfileRepository {
  get(): Promise<UserProfile>;
}

const fallbackProfile: UserProfile = {
  fullName: 'Utente Demo',
  email: 'demo@shuttlebooking.app',
  company: 'Shuttle Booking'
};

export class StaticProfileRepository implements ProfileRepository {
  async get(): Promise<UserProfile> {
    return fallbackProfile;
  }
}
