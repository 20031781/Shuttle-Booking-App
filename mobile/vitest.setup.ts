import {beforeEach, vi} from 'vitest';

/**
 * Stato in-memory dei moduli nativi che i test non possono usare davvero.
 * Viene azzerato prima di ogni test, così ogni caso parte da zero senza che
 * il singolo file di test debba ridichiarare i mock.
 */
const secureStoreState = new Map<string, string>();

export const netInfoState = {
    isConnected: true as boolean | null,
    isInternetReachable: true as boolean | null
};

vi.mock('expo-secure-store', () => ({
    getItemAsync: vi.fn(async (key: string) => secureStoreState.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
        secureStoreState.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
        secureStoreState.delete(key);
    })
}));

vi.mock('@react-native-community/netinfo', () => ({
    default: {
        fetch: vi.fn(async () => ({
            isConnected: netInfoState.isConnected,
            isInternetReachable: netInfoState.isInternetReachable
        })),
        addEventListener: vi.fn(() => () => undefined)
    }
}));

beforeEach(() => {
    secureStoreState.clear();
    netInfoState.isConnected = true;
    netInfoState.isInternetReachable = true;
});
