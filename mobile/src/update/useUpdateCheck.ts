import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';

import {loadUpdatePreviewMode} from '@/api/appPreferences';
import updateChecker, {type UpdateCheckResult} from './UpdateChecker';
import {
    buildUpdatePreviewResult,
    resolveDisplayedUpdateResult,
    type UpdatePreviewMode
} from './UpdateDisplayResolver';

export function useUpdateCheck(updateUrl: string) {
    const [actualResult, setActualResult] = useState<UpdateCheckResult | null>(null);
    const [previewMode, setPreviewMode] = useState<UpdatePreviewMode>('none');

    const runCheck = useCallback(async () => {
        if (!updateUrl) {
            setActualResult(null);
            return;
        }

        const result = await updateChecker.check(updateUrl);
        setActualResult(result);
    }, [updateUrl]);

    useEffect(() => void runCheck(), [runCheck]);

    useEffect(() => {
        let cancelled = false;

        void loadUpdatePreviewMode()
            .then(mode => {
                if (!cancelled) {
                    setPreviewMode(mode);
                }
            })
            .catch(error => console.warn('Lettura modalità preview update fallita:', error));

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') {
                void runCheck();
            }
        });

        return () => subscription.remove();
    }, [runCheck]);

    // Per la preview serve un target su cui puntare "Aggiorna ora": si usa quello
    // vero se il check è già andato a buon fine, altrimenti l'URL del manifest
    // (in preview conta vedere l'overlay, non dove porta il pulsante).
    const previewResult = buildUpdatePreviewResult(
        previewMode,
        updateChecker.getCurrentVersionCode(),
        actualResult?.config.updateUrl ?? updateUrl
    );

    return {
        updateResult: resolveDisplayedUpdateResult(actualResult, previewResult, previewMode, __DEV__),
        previewMode,
        setPreviewMode,
        runCheck
    };
}
