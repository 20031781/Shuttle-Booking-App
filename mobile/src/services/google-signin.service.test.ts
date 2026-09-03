import {describe, expect, it} from 'vitest';

import googleSignInService from './google-signin.service';
import {GoogleSignInConfigurationError} from './google-signin.types';

describe('googleSignInService web', () => {
    it('dichiara il provider non disponibile', () => {
        expect(googleSignInService.isAvailable).toBe(false);
    });

    it('segnala una configurazione mancante durante il sign in', async () => {
        await expect(googleSignInService.signIn()).rejects.toBeInstanceOf(GoogleSignInConfigurationError);
    });

    it('rende il sign out web idempotente', async () => {
        await expect(googleSignInService.signOut()).resolves.toBeUndefined();
    });
});
