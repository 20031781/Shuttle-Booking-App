import {afterEach, describe, expect, it, vi} from 'vitest';

const envKeys = ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_MOCK_MODE'] as const;
const originalEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));

async function loadConfig(options: {os: 'android' | 'ios'; scriptURL?: string; dev?: boolean}) {
    vi.resetModules();
    vi.stubGlobal('__DEV__', options.dev ?? false);
    vi.doMock('react-native', () => ({
        NativeModules: {SourceCode: {scriptURL: options.scriptURL}},
        Platform: {OS: options.os}
    }));

    return import('./config');
}

describe('apiConfig', () => {
    afterEach(() => {
        for (const key of envKeys) {
            const value = originalEnv[key];
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }

        vi.unmock('react-native');
        vi.unstubAllGlobals();
    });

    it('usa l host locale del bundle Expo in sviluppo', async () => {
        delete process.env.EXPO_PUBLIC_API_URL;
        delete process.env.EXPO_PUBLIC_API_BASE_URL;
        process.env.EXPO_PUBLIC_MOCK_MODE = 'false';

        const {apiConfig} = await loadConfig({
            os: 'android',
            dev: true,
            scriptURL: 'http://192.168.1.25:8081/index.bundle?platform=android'
        });

        expect(apiConfig.baseUrl).toBe('http://192.168.1.25:5000');
        expect(apiConfig.mockMode).toBe(false);
    });

    it('usa il fallback Android emulator quando non rileva un host diretto', async () => {
        delete process.env.EXPO_PUBLIC_API_URL;
        delete process.env.EXPO_PUBLIC_API_BASE_URL;

        const {apiConfig} = await loadConfig({
            os: 'android',
            dev: true,
            scriptURL: 'https://expo.dev/bundle'
        });

        expect(apiConfig.baseUrl).toBe('http://10.0.2.2:5000');
    });

    it('preferisce la configurazione esplicita e abilita il mock mode', async () => {
        process.env.EXPO_PUBLIC_API_URL = ' https://api.example.test/// ';
        process.env.EXPO_PUBLIC_API_BASE_URL = 'https://legacy.example.test';
        process.env.EXPO_PUBLIC_MOCK_MODE = 'true';

        const {apiConfig} = await loadConfig({os: 'ios'});

        expect(apiConfig.baseUrl).toBe('https://api.example.test');
        expect(apiConfig.mockMode).toBe(true);
    });
});
