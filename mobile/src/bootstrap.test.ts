import {describe, expect, it, vi} from 'vitest';

/**
 * Verifica il contenuto del bootstrap. L'ordine rispetto ad App.tsx è invece
 * verificato in `entry.test.ts`: sta in un file separato perché serve un
 * registry dei moduli pulito, che Vitest garantisce solo tra file diversi.
 */
const loadOrder = vi.hoisted(() => [] as string[]);

vi.mock('react-native-gesture-handler', () => {
    loadOrder.push('gesture-handler');
    return {};
});

describe('bootstrap nativo', () => {
    it('inizializza gesture-handler come effetto collaterale', async () => {
        await import('./bootstrap');

        expect(loadOrder).toContain('gesture-handler');
    });
});

describe('bootstrap web', () => {
    it('non importa nulla di nativo nel bundle del browser', async () => {
        const before = [...loadOrder];

        await import('./bootstrap.web');

        expect(loadOrder).toEqual(before);
    });
});
