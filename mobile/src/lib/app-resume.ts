import type {SessionSnapshot} from '@/api/authSession';

export type AppResumeTrigger = 'network' | 'appState';

export type AppResumeRecoveryOptions = {
    recoverSession: () => Promise<SessionSnapshot>;
    refreshProfile: () => Promise<void>;
    checkApiReachability: (force?: boolean) => Promise<boolean>;
    onError: (trigger: AppResumeTrigger, error: unknown) => void;
};

export type AppResumeRecoveryResult = {
    wasAuthenticated: boolean;
    didRefreshProfile: boolean;
    isOfflineMode: boolean;
};

/**
 * Sequenza di recupero eseguita quando l'app torna in primo piano o la rete
 * ritorna: prova a recuperare la sessione e, solo se è tornata davvero online,
 * risincronizza il profilo e riconferma la raggiungibilità dell'API.
 *
 * Vive qui e non dentro App.tsx perché è la logica che vale la pena testare:
 * gli errori non devono mai propagarsi (il recupero è best-effort).
 */
export async function runAppResumeRecovery(
    trigger: AppResumeTrigger,
    {recoverSession, refreshProfile, checkApiReachability, onError}: AppResumeRecoveryOptions
): Promise<AppResumeRecoveryResult> {
    const idleResult: AppResumeRecoveryResult = {
        wasAuthenticated: false,
        didRefreshProfile: false,
        isOfflineMode: false
    };

    try {
        const snapshot = await recoverSession();

        if (!snapshot.isAuthenticated) {
            return idleResult;
        }

        if (snapshot.isOfflineMode) {
            return {wasAuthenticated: true, didRefreshProfile: false, isOfflineMode: true};
        }

        await refreshProfile();
        await checkApiReachability(true);

        return {wasAuthenticated: true, didRefreshProfile: true, isOfflineMode: false};
    } catch (error) {
        onError(trigger, error);
        return idleResult;
    }
}
