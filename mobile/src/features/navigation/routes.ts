export type AppSection = 'shuttle' | 'bookings' | 'admin' | 'manager' | 'profile';

/** Rotte dello stack del tab Profilo. */
export type ProfileStackParamList = {
    ProfileHome: undefined;
    ProfileSettings: undefined;
};

export type AppTabParamList = {
    shuttle: undefined;
    bookings: undefined;
    admin: undefined;
    manager: undefined;
    profile: undefined;
};
