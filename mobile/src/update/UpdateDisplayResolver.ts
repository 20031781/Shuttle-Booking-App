import type {UpdateCheckResult} from './UpdateChecker';

export type UpdatePreviewMode = 'none' | 'optional' | 'required';

/**
 * Costruisce un risultato finto per vedere l'UI di aggiornamento senza dover
 * pubblicare una nuova versione: l'unico altro modo per testare il blocco da
 * "aggiornamento obbligatorio" sarebbe alzare davvero il versionCode in remoto.
 */
export function buildUpdatePreviewResult(
    mode: UpdatePreviewMode,
    currentVersionCode: number,
    updateTargetUrl?: string | null
): UpdateCheckResult | null {
    if (mode === 'none' || !updateTargetUrl) {
        return null;
    }

    return {
        requirement: mode,
        config: {
            latestVersionCode: currentVersionCode + 1,
            // In modalità "required" la versione minima supera quella installata,
            // così l'app risulta fuori supporto e l'overlay diventa bloccante.
            minSupportedVersionCode: mode === 'required' ? currentVersionCode + 1 : currentVersionCode,
            updateUrl: updateTargetUrl
        },
        currentVersionCode
    };
}

/**
 * Decide quale risultato mostrare davvero:
 * - se è attiva una preview, vince sempre quella (serve proprio a forzare l'UI);
 * - in dev build il check reale viene soppresso, altrimenti il versionCode locale
 *   (spesso 0 o disallineato) farebbe comparire l'overlay a ogni avvio.
 */
export function resolveDisplayedUpdateResult(
    actualResult: UpdateCheckResult | null,
    previewResult: UpdateCheckResult | null,
    previewMode: UpdatePreviewMode,
    isDevBuild: boolean
): UpdateCheckResult | null {
    if (previewMode !== 'none') {
        return previewResult;
    }

    return isDevBuild ? null : actualResult;
}
