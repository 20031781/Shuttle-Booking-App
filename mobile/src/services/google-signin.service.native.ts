import {Platform} from 'react-native';

import {
    GoogleSignInConfigurationError,
    GoogleSignInProviderError,
    type GoogleSignInService,
} from './google-signin.types';

type NitroGoogleSignInModule = typeof import('react-native-nitro-google-signin');

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB?.trim() ?? '';
const isIosSignInEnabled =
    process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_IOS_ENABLED?.trim().toLowerCase() === 'true';
const isPlatformEnabled = Platform.OS !== 'ios' || isIosSignInEnabled;
let configured = false;
let modulePromise: Promise<NitroGoogleSignInModule> | null = null;

const loadNativeModule = () => {
    modulePromise ??= import('react-native-nitro-google-signin');
    return modulePromise;
};

// Il componente di sistema che disegna il selettore può non rispondere: un
// timeout evita di lasciare l'interfaccia in caricamento indefinitamente.
const credentialUiTimeoutMs = 60_000;

const withTimeout = async <T>(operation: Promise<T>, step: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            operation,
            new Promise<never>((_resolve, reject) => {
                timer = setTimeout(
                    () => reject(new GoogleSignInProviderError(
                        `Google Sign-In: "${step}" non ha risposto entro ${credentialUiTimeoutMs / 1000}s`,
                    )),
                    credentialUiTimeoutMs,
                );
            }),
        ]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
};

const ensureConfigured = async (): Promise<NitroGoogleSignInModule> => {
    if (!webClientId || !isPlatformEnabled) {
        throw new GoogleSignInConfigurationError();
    }

    const nativeModule = await loadNativeModule();
    if (!configured) {
        nativeModule.GoogleOneTapSignIn.configure({
            webClientId,
            offlineAccess: false,
            autoSelectOnSignIn: false,
        });
        configured = true;
    }

    return nativeModule;
};

type OneTapResponse = Awaited<ReturnType<NitroGoogleSignInModule['GoogleOneTapSignIn']['signIn']>>;

const readIdToken = (nativeModule: NitroGoogleSignInModule, response: OneTapResponse): string => {
    if (!nativeModule.isSuccessResponse(response)) {
        throw new GoogleSignInProviderError();
    }

    const idToken = response.data.idToken.trim();
    if (!idToken) {
        throw new GoogleSignInProviderError();
    }

    return idToken;
};

const googleSignInService: GoogleSignInService = {
    isAvailable: Boolean(webClientId) && isPlatformEnabled,

    async signIn(options) {
        const nativeModule = await ensureConfigured();

        try {
            await nativeModule.GoogleOneTapSignIn.checkPlayServices(true);

            // Questo è il percorso usato dal link "Usa un altro account": evita
            // che Credential Manager restituisca subito l'account già autorizzato.
            if (options?.forceAccountPicker) {
                const response = await withTimeout(
                    nativeModule.GoogleOneTapSignIn.presentExplicitSignIn(),
                    'presentExplicitSignIn',
                );
                if (nativeModule.isCancelledResponse(response)) {
                    return null;
                }

                return readIdToken(nativeModule, response);
            }

            let response = await withTimeout(nativeModule.GoogleOneTapSignIn.signIn(), 'signIn');
            if (nativeModule.isCancelledResponse(response)) {
                return null;
            }

            if (nativeModule.isNoSavedCredentialFoundResponse(response)) {
                response = await withTimeout(
                    nativeModule.GoogleOneTapSignIn.createAccount(),
                    'createAccount',
                );
            }
            if (nativeModule.isCancelledResponse(response)) {
                return null;
            }

            if (nativeModule.isNoSavedCredentialFoundResponse(response)) {
                response = await withTimeout(
                    nativeModule.GoogleOneTapSignIn.presentExplicitSignIn(),
                    'presentExplicitSignIn',
                );
            }
            if (nativeModule.isCancelledResponse(response)) {
                return null;
            }

            return readIdToken(nativeModule, response);
        } catch (error: unknown) {
            if (
                nativeModule.isErrorWithCode(error)
                && error.code === nativeModule.statusCodes.SIGN_IN_CANCELLED
            ) {
                return null;
            }
            throw error;
        }
    },

    async signOut() {
        if (!webClientId || !isPlatformEnabled) {
            return;
        }

        try {
            const nativeModule = await ensureConfigured();
            await nativeModule.GoogleOneTapSignIn.signOut();
        } catch {
            // Il logout dell'app non deve fallire se il modulo nativo non è disponibile.
        }
    },
};

export default googleSignInService;
