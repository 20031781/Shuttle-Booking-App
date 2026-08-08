import type {ExpoConfig} from 'expo/config';
import {existsSync} from 'fs';
import path from 'path';

import base from './app.json';

const expoConfig = base.expo as ExpoConfig;
const googleServicesRelativePath = './google-services.json';

const readNonEmptyEnv = (name: string): string | undefined => {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
};

export default (): ExpoConfig => {
    const googleServicesFromEnv = readNonEmptyEnv('GOOGLE_SERVICES_JSON');
    const isEasBuild = process.env.EAS_BUILD === 'true';
    const buildProfile = process.env.EAS_BUILD_PROFILE ?? '';
    const buildPlatform = process.env.EAS_BUILD_PLATFORM ?? '';
    const isProductionBuild = isEasBuild && buildProfile === 'production';
    const hasLocalGoogleServices = existsSync(path.resolve(__dirname, googleServicesRelativePath));
    const googleServicesFile = googleServicesFromEnv ?? (!isEasBuild && hasLocalGoogleServices
        ? googleServicesRelativePath
        : undefined);

    // Le push Android passano da FCM: senza google-services.json la build parte ma
    // crasha all'avvio quando expo-notifications inizializza Firebase. Meglio far
    // fallire subito la build remota che scoprirlo dai crash in produzione.
    if (isProductionBuild && buildPlatform === 'android' && !googleServicesFromEnv) {
        throw new Error(
            'GOOGLE_SERVICES_JSON non configurato su EAS per il profilo production. '
            + 'Imposta una file environment variable per includere google-services.json nella build remota.'
        );
    }

    const googleClientId = readNonEmptyEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID')
        ?? readNonEmptyEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_EXPO');

    if (isProductionBuild && buildPlatform === 'android' && !googleClientId) {
        throw new Error(
            'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID (o _EXPO) non configurato su EAS per il profilo production: '
            + 'il login Google resterebbe nascosto nella build pubblicata.'
        );
    }

    if (!googleServicesFile) {
        console.warn(
            isEasBuild
                ? 'google-services.json non configurato su EAS: imposta GOOGLE_SERVICES_JSON per le notifiche Android.'
                : 'google-services.json non trovato in locale: warning non bloccante per Expo Go. '
                + 'Aggiungilo o imposta GOOGLE_SERVICES_JSON per testare le push Android su dev build.'
        );
    }

    return {
        ...expoConfig,
        android: {
            ...expoConfig.android,
            ...(googleServicesFile ? {googleServicesFile} : {})
        }
    };
};
