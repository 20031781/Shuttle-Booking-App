export type Shuttle = {
  id: string;
  routeName: string;
  departureTime: string;
  seatsAvailable: number;
};

export type UserProfile = {
  fullName: string;
  email: string;
  company: string;
};

export type BookingStatus = 'active' | 'canceled';

export type Booking = {
  id: string;
  shuttleId: string;
  shuttleName: string;
  date: string;
  status: BookingStatus;
  seatsRemaining?: number;
};
