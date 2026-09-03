import {beforeEach, describe, expect, it, vi} from 'vitest';

const nitroGoogleMock = vi.hoisted(() => ({
    configure: vi.fn(),
    checkPlayServices: vi.fn(),
    signIn: vi.fn(),
    createAccount: vi.fn(),
    presentExplicitSignIn: vi.fn(),
    signOut: vi.fn(),
}));
const platformMock = vi.hoisted(() => ({OS: 'android'}));

vi.mock('react-native', () => ({Platform: platformMock}));

vi.mock('react-native-nitro-google-signin', () => ({
    GoogleOneTapSignIn: nitroGoogleMock,
    isSuccessResponse: (response: {type?: string} | null | undefined) => response?.type === 'success',
    isNoSavedCredentialFoundResponse: (response: {type?: string} | null | undefined) =>
        response?.type === 'noSavedCredentialFound',
    isCancelledResponse: (response: {type?: string} | null | undefined) => response?.type === 'cancelled',
    isErrorWithCode: (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error),
    statusCodes: {
        SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    },
}));

const loadService = async () => (await import('@/services/google-signin.service.native')).default;

describe('nativeGoogleSignInService', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        platformMock.OS = 'android';
        nitroGoogleMock.configure.mockReset();
        nitroGoogleMock.checkPlayServices.mockReset();
        nitroGoogleMock.checkPlayServices.mockResolvedValue(undefined);
        nitroGoogleMock.signIn.mockReset();
        nitroGoogleMock.createAccount.mockReset();
        nitroGoogleMock.presentExplicitSignIn.mockReset();
        nitroGoogleMock.signOut.mockReset();
        nitroGoogleMock.signOut.mockResolvedValue(undefined);
    });

    it('rimane indisponibile senza il Web OAuth client ID', async () => {
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', '');
        const service = await loadService();

        expect(service.isAvailable).toBe(false);
        await expect(service.signIn()).rejects.toThrow('Google Sign-In is not configured');
        expect(nitroGoogleMock.configure).not.toHaveBeenCalled();
    });

    it('configura il modulo e segue il fallback del selettore nativo', async () => {
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', 'web-client.apps.googleusercontent.com');
        nitroGoogleMock.signIn.mockResolvedValue({type: 'noSavedCredentialFound', data: null});
        nitroGoogleMock.createAccount.mockResolvedValue({type: 'noSavedCredentialFound', data: null});
        nitroGoogleMock.presentExplicitSignIn.mockResolvedValue({
            type: 'success',
            data: {idToken: ' native-id-token '},
        });
        const service = await loadService();

        await expect(service.signIn()).resolves.toBe('native-id-token');
        expect(nitroGoogleMock.configure).toHaveBeenCalledWith({
            webClientId: 'web-client.apps.googleusercontent.com',
            offlineAccess: false,
            autoSelectOnSignIn: false,
        });
        expect(nitroGoogleMock.checkPlayServices).toHaveBeenCalledWith(true);
        expect(nitroGoogleMock.createAccount).toHaveBeenCalledOnce();
        expect(nitroGoogleMock.presentExplicitSignIn).toHaveBeenCalledOnce();
    });

    it("forza il selettore completo quando l'utente cambia account", async () => {
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', 'web-client.apps.googleusercontent.com');
        nitroGoogleMock.presentExplicitSignIn.mockResolvedValue({
            type: 'success',
            data: {idToken: ' switched-account-token '},
        });
        const service = await loadService();

        await expect(service.signIn({forceAccountPicker: true})).resolves.toBe('switched-account-token');
        expect(nitroGoogleMock.signIn).not.toHaveBeenCalled();
        expect(nitroGoogleMock.createAccount).not.toHaveBeenCalled();
        expect(nitroGoogleMock.presentExplicitSignIn).toHaveBeenCalledOnce();
    });

    it('resta disabilitato su iOS finché non viene abilitato esplicitamente', async () => {
        platformMock.OS = 'ios';
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', 'web-client.apps.googleusercontent.com');
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_SIGN_IN_IOS_ENABLED', 'false');
        const service = await loadService();

        expect(service.isAvailable).toBe(false);
        await expect(service.signIn()).rejects.toThrow('Google Sign-In is not configured');
        expect(nitroGoogleMock.configure).not.toHaveBeenCalled();
    });

    it('tratta l-annullamento del selettore come una mancata scelta', async () => {
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', 'web-client.apps.googleusercontent.com');
        nitroGoogleMock.signIn.mockResolvedValue({type: 'cancelled', data: null});
        const service = await loadService();

        await expect(service.signIn()).resolves.toBeNull();
        expect(nitroGoogleMock.createAccount).not.toHaveBeenCalled();
    });

    it('tratta l-errore nativo di annullamento come una mancata scelta', async () => {
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', 'web-client.apps.googleusercontent.com');
        nitroGoogleMock.signIn.mockRejectedValue({code: 'SIGN_IN_CANCELLED', message: 'Cancelled'});
        const service = await loadService();

        await expect(service.signIn()).resolves.toBeNull();
    });

    it('lascia il sign-out nativo best effort', async () => {
        vi.stubEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB', 'web-client.apps.googleusercontent.com');
        nitroGoogleMock.signOut.mockRejectedValue(new Error('Native failure'));
        const service = await loadService();

        await expect(service.signOut()).resolves.toBeUndefined();
    });
});
