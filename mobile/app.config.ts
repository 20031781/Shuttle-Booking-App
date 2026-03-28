import type {ExpoConfig} from 'expo/config';
import {existsSync} from 'fs';
import path from 'path';

const base = require('./app.json');
const expoConfig = base.expo as ExpoConfig;
const googleServicesRelativePath = './google-services.json';

export default (): ExpoConfig => {
    const googleServicesFromEnv = process.env.GOOGLE_SERVICES_JSON;
    const isEasBuild = process.env.EAS_BUILD === 'true';
    const hasLocalGoogleServices = existsSync(path.resolve(__dirname, googleServicesRelativePath));
    const googleServicesFile = googleServicesFromEnv ?? (!isEasBuild && hasLocalGoogleServices
        ? googleServicesRelativePath
        : undefined);

    if (!googleServicesFile) {
        console.warn(
            isEasBuild
                ? 'google-services.json non configurato su EAS: imposta GOOGLE_SERVICES_JSON per notifiche Android.'
                : 'google-services.json non trovato in locale: warning non bloccante per Expo Go. Aggiungilo o imposta GOOGLE_SERVICES_JSON per test push Android su dev build.'
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
