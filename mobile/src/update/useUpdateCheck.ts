import {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';

import updateChecker, {UpdateCheckResult} from './UpdateChecker';

export function useUpdateCheck(updateUrl: string) {
    const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);

    const runCheck = useCallback(async () => {
        if (!updateUrl) {
            setUpdateResult(null);
            return;
        }

        const result = await updateChecker.check(updateUrl);
        setUpdateResult(result);
    }, [updateUrl]);

    useEffect(() => void runCheck(), [runCheck]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') {
                void runCheck();
            }
        });

        return () => subscription.remove();
    }, [runCheck]);

    return {
        updateResult,
        runCheck
    };
}
