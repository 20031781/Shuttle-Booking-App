import {beforeEach, describe, expect, it, vi} from 'vitest';

const platformState = vi.hoisted((): {os: string} => ({os: 'android'}));
const constantsState = vi.hoisted((): {versionCode: number | undefined} => ({versionCode: 5}));

vi.mock('react-native', () => ({
    get Platform() {
        return {OS: platformState.os};
    }
}));

vi.mock('expo-constants', () => ({
    default: {
        get expoConfig() {
            return {android: {versionCode: constantsState.versionCode}};
        },
        manifest2: null,
        manifest: null
    }
}));

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

async function loadChecker() {
    vi.resetModules();
    const module = await import('./UpdateChecker');
    return module.default;
}

describe('UpdateChecker.check', () => {
    const fetchMock = vi.fn<typeof fetch>();

    beforeEach(() => {
        platformState.os = 'android';
        constantsState.versionCode = 5;
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    it('non controlla nulla fuori da Android', async () => {
        platformState.os = 'ios';
        const checker = await loadChecker();

        await expect(checker.check('https://example.test/update.json')).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('non controlla nulla senza URL', async () => {
        const checker = await loadChecker();

        await expect(checker.check('')).resolves.toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('valuta il requisito confrontando il versionCode installato', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({
            latestVersionCode: 9,
            minSupportedVersionCode: 7,
            updateUrl: 'https://example.test/app.apk'
        }));

        const checker = await loadChecker();
        const result = await checker.check('https://example.test/update.json');

        // Installata la 5, minima supportata 7 → aggiornamento obbligatorio.
        expect(result?.requirement).toBe('required');
        expect(result?.currentVersionCode).toBe(5);
        expect(result?.config.updateUrl).toBe('https://example.test/app.apk');
    });

    it('accetta storeUrl e apkUrl come target alternativi', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({
            latestVersionCode: 6,
            minSupportedVersionCode: 1,
            storeUrl: 'https://play.google.test/store'
        }));

        const checker = await loadChecker();
        const result = await checker.check('https://example.test/update.json');

        expect(result?.requirement).toBe('optional');
        expect(result?.config.updateUrl).toBe('https://play.google.test/store');
    });

    it('scarta un manifest privo dei campi obbligatori', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({latestVersionCode: 9}));

        const checker = await loadChecker();

        await expect(checker.check('https://example.test/update.json')).resolves.toBeNull();
    });

    it('scarta URL non http(s) per non aprire schemi arbitrari', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({
            latestVersionCode: 9,
            minSupportedVersionCode: 1,
            updateUrl: 'javascript:alert(1)'
        }));

        const checker = await loadChecker();
        const result = await checker.check('https://example.test/update.json');

        expect(result?.config.updateUrl).toBeUndefined();
    });

    it('restituisce null su risposta non ok o errore di rete', async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, {status: 404}));
        const checker = await loadChecker();
        await expect(checker.check('https://example.test/update.json')).resolves.toBeNull();

        fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await expect(checker.check('https://example.test/update.json')).resolves.toBeNull();
    });

    it('usa 0 come versionCode quando il manifest Expo non lo espone', async () => {
        constantsState.versionCode = undefined;
        const checker = await loadChecker();

        expect(checker.getCurrentVersionCode()).toBe(0);
    });
});
