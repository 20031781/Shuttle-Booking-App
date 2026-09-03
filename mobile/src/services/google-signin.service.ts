import {
    GoogleSignInConfigurationError,
    type GoogleSignInService,
} from './google-signin.types';

// Fallback web/non-native. Metro risolve google-signin.service.native.ts su
// Android e iOS, così il modulo Nitro non viene caricato nel bundle browser.
const googleSignInService: GoogleSignInService = {
    isAvailable: false,
    signIn() {
        return Promise.reject(new GoogleSignInConfigurationError());
    },
    signOut() {
        return Promise.resolve();
    },
};

export default googleSignInService;
