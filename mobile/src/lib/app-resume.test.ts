import {describe, expect, it, vi} from 'vitest';

import type {SessionSnapshot} from '@/api/authSession';
import {runAppResumeRecovery} from './app-resume';

function snapshot(overrides?: Partial<SessionSnapshot>): SessionSnapshot {
    return {
        isAuthenticated: true,
        isOfflineMode: false,
        requiresRelogin: false,
        reloginMessage: null,
        user: null,
        ...overrides
    };
}

function createOptions(overrides?: Partial<Parameters<typeof runAppResumeRecovery>[1]>) {
    return {
        recoverSession: vi.fn(async () => snapshot()),
        refreshProfile: vi.fn(async () => undefined),
        checkApiReachability: vi.fn(async () => true),
        onError: vi.fn(),
        ...overrides
    };
}

describe('runAppResumeRecovery', () => {
    it('risincronizza profilo e raggiungibilità quando la sessione è online', async () => {
        const options = createOptions();

        const result = await runAppResumeRecovery('appState', options);

        expect(result).toEqual({wasAuthenticated: true, didRefreshProfile: true, isOfflineMode: false});
        expect(options.refreshProfile).toHaveBeenCalledTimes(1);
        expect(options.checkApiReachability).toHaveBeenCalledWith(true);
    });

    it('non risincronizza nulla quando l\'utente non è autenticato', async () => {
        const options = createOptions({
            recoverSession: vi.fn(async () => snapshot({isAuthenticated: false}))
        });

        const result = await runAppResumeRecovery('network', options);

        expect(result.wasAuthenticated).toBe(false);
        expect(options.refreshProfile).not.toHaveBeenCalled();
        expect(options.checkApiReachability).not.toHaveBeenCalled();
    });

    it('non chiama il backend quando la sessione è in modalità offline', async () => {
        const options = createOptions({
            recoverSession: vi.fn(async () => snapshot({isOfflineMode: true}))
        });

        const result = await runAppResumeRecovery('network', options);

        expect(result).toEqual({wasAuthenticated: true, didRefreshProfile: false, isOfflineMode: true});
        expect(options.refreshProfile).not.toHaveBeenCalled();
    });

    it('non propaga gli errori: il recupero è best-effort', async () => {
        const failure = new Error('boom');
        const options = createOptions({
            recoverSession: vi.fn(async () => {
                throw failure;
            })
        });

        const result = await runAppResumeRecovery('appState', options);

        expect(result.wasAuthenticated).toBe(false);
        expect(options.onError).toHaveBeenCalledWith('appState', failure);
    });

    it('segnala anche un fallimento del refresh profilo senza lanciare', async () => {
        const failure = new Error('profilo ko');
        const options = createOptions({
            refreshProfile: vi.fn(async () => {
                throw failure;
            })
        });

        const result = await runAppResumeRecovery('network', options);

        expect(result.didRefreshProfile).toBe(false);
        expect(options.onError).toHaveBeenCalledWith('network', failure);
    });
});
