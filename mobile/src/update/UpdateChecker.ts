import Constants from 'expo-constants';
import {Platform} from 'react-native';

import {UpdateConfig, UpdatePolicy, type UpdateRequirement} from './UpdatePolicy';

type RawUpdateConfig = {
    latestVersionCode?: unknown;
    minSupportedVersionCode?: unknown;
    updateUrl?: unknown;
    storeUrl?: unknown;
    apkUrl?: unknown;
};

export interface UpdateCheckResult {
    requirement: UpdateRequirement;
    config: UpdateConfig;
    currentVersionCode: number;
}

function normalizeUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return undefined;
        }
        return parsed.toString();
    } catch {
        return undefined;
    }
}

function parseIntField(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
        return value;
    }

    return null;
}

function parseUpdateConfig(value: unknown): UpdateConfig | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const raw = value as RawUpdateConfig;
    const latestVersionCode = parseIntField(raw.latestVersionCode);
    const minSupportedVersionCode = parseIntField(raw.minSupportedVersionCode);

    if (latestVersionCode === null || minSupportedVersionCode === null) {
        return null;
    }

    const updateUrl = normalizeUrl(raw.updateUrl) ?? normalizeUrl(raw.storeUrl) ?? normalizeUrl(raw.apkUrl);
    return {
        latestVersionCode,
        minSupportedVersionCode,
        updateUrl
    };
}

class UpdateChecker {
    getCurrentVersionCode(): number {
        const candidates = [
            Constants.expoConfig?.android?.versionCode,
            (Constants.manifest2 as { android?: { versionCode?: number } } | null | undefined)?.android?.versionCode,
            (Constants.manifest as { android?: { versionCode?: number } } | null | undefined)?.android?.versionCode
        ];

        for (const candidate of candidates) {
            if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0) {
                return candidate;
            }
        }

        return 0;
    }

    async check(updateUrl: string): Promise<UpdateCheckResult | null> {
        if (!updateUrl || Platform.OS !== 'android') {
            return null;
        }

        try {
            const response = await fetch(updateUrl, {
                method: 'GET',
                headers: {
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            const config = parseUpdateConfig(payload);
            if (!config) {
                console.warn('Update config non valido');
                return null;
            }

            const currentVersionCode = this.getCurrentVersionCode();
            const requirement = UpdatePolicy.evaluate(currentVersionCode, config);

            if (requirement !== 'upToDate' && !config.updateUrl) {
                console.warn('Update richiesto ma updateUrl/storeUrl/apkUrl non configurato');
            }

            return {
                requirement,
                config,
                currentVersionCode
            };
        } catch (error) {
            console.warn('Controllo update fallito', error);
            return null;
        }
    }
}

export default new UpdateChecker();
