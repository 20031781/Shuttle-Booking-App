export type Shuttle = {
    id: string;
    routeName: string;
    departureTime: string;
    meetingAtUtc: string;
    seatsAvailable: number;
};

export type UserProfile = {
    firstName: string;
    lastName: string;
    email: string;
    city: string;
    club: string;
    username: string;
    isProfileCompleted: boolean;
};

export type UserAccess = {
    isAdmin: boolean;
    isManager: boolean;
};

export type ManagerShuttle = {
    id: string;
    name: string;
    capacity: number;
    availableSeats: number;
    meetingAtUtc: string;
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
