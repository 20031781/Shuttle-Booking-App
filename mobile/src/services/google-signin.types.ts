export type GoogleSignInOptions = {
    /**
     * Salta il rientro rapido e apre sempre il selettore completo degli account.
     * Serve per cambiare account: Google altrimenti può riproporre l'account già autorizzato.
     */
    forceAccountPicker?: boolean;
};

export type GoogleSignInService = {
    readonly isAvailable: boolean;
    signIn(options?: GoogleSignInOptions): Promise<string | null>;
    signOut(): Promise<void>;
};

export class GoogleSignInConfigurationError extends Error {
    constructor() {
        super('Google Sign-In is not configured');
        this.name = 'GoogleSignInConfigurationError';
    }
}

export class GoogleSignInProviderError extends Error {
    constructor(message = 'Google Sign-In did not return a valid ID token') {
        super(message);
        this.name = 'GoogleSignInProviderError';
    }
}
