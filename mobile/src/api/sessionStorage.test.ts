import * as SecureStore from 'expo-secure-store';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
    clearStoredSessionTokens,
    clearStoredSessionUser,
    loadStoredSessionTokens,
    loadStoredSessionUser,
    saveStoredSessionTokens,
    saveStoredSessionUser
} from './sessionStorage';

describe('sessionStorage', () => {
    beforeEach(async () => {
        vi.mocked(SecureStore.getItemAsync).mockReset();
        vi.mocked(SecureStore.setItemAsync).mockReset();
        vi.mocked(SecureStore.deleteItemAsync).mockReset();

        vi.mocked(SecureStore.getItemAsync).mockImplementation(async () => null);
        vi.mocked(SecureStore.setItemAsync).mockResolvedValue(undefined);
        vi.mocked(SecureStore.deleteItemAsync).mockResolvedValue(undefined);

        await clearStoredSessionTokens();
        await clearStoredSessionUser();
    });

    it('salva e rilegge token e utente in forma tipizzata', async () => {
        const tokens = {
            accessToken: 'access',
            accessTokenExpiration: '2030-01-01T00:00:00Z',
            refreshToken: 'refresh',
            refreshTokenExpiration: '2030-02-01T00:00:00Z'
        };
        const user = {
            firstName: 'Mario',
            lastName: 'Rossi',
            email: 'mario@test.it',
            city: 'Roma',
            club: '',
            username: 'mrossi',
            isProfileCompleted: true
        };

        await saveStoredSessionTokens(tokens);
        await saveStoredSessionUser(user);

        await expect(loadStoredSessionTokens()).resolves.toEqual(tokens);
        await expect(loadStoredSessionUser()).resolves.toEqual(user);
    });

    it('rimuove un valore JSON corrotto invece di propagarne l errore', async () => {
        vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('not-json');

        await expect(loadStoredSessionTokens()).resolves.toBeNull();
        expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(
            'shuttlebooking.session.tokens.v1',
            expect.any(Object)
        );
    });

    it('svuota i valori persistiti', async () => {
        await saveStoredSessionTokens({
            accessToken: 'access',
            accessTokenExpiration: '2030-01-01T00:00:00Z',
            refreshToken: 'refresh',
            refreshTokenExpiration: '2030-02-01T00:00:00Z'
        });

        await clearStoredSessionTokens();

        await expect(loadStoredSessionTokens()).resolves.toBeNull();
    });
});
