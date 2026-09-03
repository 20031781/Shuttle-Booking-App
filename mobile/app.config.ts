import type {ExpoConfig} from 'expo/config';
import {existsSync} from 'fs';
import path from 'path';

import base from './app.base.json';

const expoConfig = base.expo as ExpoConfig;
const googleServicesRelativePath = './google-services.json';
const googleServiceInfoRelativePath = './GoogleService-Info.plist';

const readNonEmptyEnv = (name: string): string | undefined => {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
};

export default (): ExpoConfig => {
    const googleServicesFromEnv = readNonEmptyEnv('GOOGLE_SERVICES_JSON');
    const googleServiceInfoFromEnv = readNonEmptyEnv('GOOGLE_SERVICE_INFO_PLIST');
    const googleWebClientId = readNonEmptyEnv('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB');
    const googleIosSignInEnabled =
        readNonEmptyEnv('EXPO_PUBLIC_GOOGLE_SIGN_IN_IOS_ENABLED')?.toLowerCase() === 'true';
    const isEasBuild = process.env.EAS_BUILD === 'true';
    const buildProfile = process.env.EAS_BUILD_PROFILE ?? '';
    const buildPlatform = process.env.EAS_BUILD_PLATFORM ?? '';
    const isProductionBuild = isEasBuild && buildProfile === 'production';
    const hasLocalGoogleServices = existsSync(path.resolve(__dirname, googleServicesRelativePath));
    const hasLocalGoogleServiceInfo = existsSync(path.resolve(__dirname, googleServiceInfoRelativePath));
    const googleServicesFile = googleServicesFromEnv ?? (!isEasBuild && hasLocalGoogleServices
        ? googleServicesRelativePath
        : undefined);
    const googleServiceInfoFile = googleServiceInfoFromEnv ?? (!isEasBuild && hasLocalGoogleServiceInfo
        ? googleServiceInfoRelativePath
        : undefined);

    // Le push Android e Google Sign-In condividono il file Google Services.
    // Senza di esso una build production si completerebbe, ma non avrebbe la
    // configurazione nativa necessaria all'avvio.
    if (isProductionBuild && buildPlatform === 'android' && !googleServicesFromEnv) {
        throw new Error(
            'GOOGLE_SERVICES_JSON non configurato su EAS per il profilo production. '
            + 'Imposta una file environment variable per includere google-services.json nella build remota.'
        );
    }

    if (isProductionBuild && buildPlatform === 'ios' && googleIosSignInEnabled && !googleServiceInfoFromEnv) {
        throw new Error(
            'GOOGLE_SERVICE_INFO_PLIST non configurato su EAS per il profilo production iOS. '
            + 'Imposta una file environment variable per includere GoogleService-Info.plist nella build remota.'
        );
    }

    const googleRequiredForBuild = buildPlatform === 'android'
        || (buildPlatform === 'ios' && googleIosSignInEnabled);
    if (isProductionBuild && googleRequiredForBuild && !googleWebClientId) {
        throw new Error(
            'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB non configurato su EAS per il profilo production. '
            + "Usa lo stesso Web OAuth Client ID configurato nel backend per validare l'audience del token."
        );
    }

    if (!googleServicesFile && buildPlatform !== 'ios') {
        console.warn(
            isEasBuild
                ? 'google-services.json non configurato su EAS: imposta GOOGLE_SERVICES_JSON per push e Google Sign-In Android.'
                : 'google-services.json non trovato in locale: imposta GOOGLE_SERVICES_JSON o aggiungi il file per la dev build Android.'
        );
    }

    if (googleIosSignInEnabled && !googleServiceInfoFile && buildPlatform === 'ios') {
        console.warn('GoogleService-Info.plist non configurato: Google Sign-In nativo non sarà disponibile su iOS.');
    }

    if (!googleWebClientId) {
        console.warn('EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB non configurato: il pulsante Google resterà nascosto.');
    }

    if (buildPlatform === 'ios' && !googleIosSignInEnabled) {
        console.warn(
            'Google Sign-In iOS disabilitato. Abilitalo solo dopo aver configurato il client OAuth iOS e il relativo plist.'
        );
    }

    const basePlugins: NonNullable<ExpoConfig['plugins']> = expoConfig.plugins ?? [];
    const googlePlugins: NonNullable<ExpoConfig['plugins']> = googleServicesFile || googleServiceInfoFile
        ? ['react-native-nitro-google-signin']
        : [];

    return {
        ...expoConfig,
        plugins: [
            ...basePlugins,
            ...googlePlugins,
        ],
        android: {
            ...expoConfig.android,
            ...(googleServicesFile ? {googleServicesFile} : {})
        },
        ios: {
            ...expoConfig.ios,
            ...(googleServiceInfoFile ? {googleServicesFile: googleServiceInfoFile} : {})
        }
    };
};
