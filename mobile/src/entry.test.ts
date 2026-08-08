import {describe, expect, it, vi} from 'vitest';

/**
 * Il valore di `index.ts` + `bootstrap.ts` è tutto nell'ordine di valutazione:
 * il bootstrap nativo deve completarsi prima che App.tsx venga caricato.
 * Questo test blocca quella garanzia, che altrimenti si romperebbe in silenzio
 * al primo riordino automatico degli import — e il sintomo sarebbe solo "i
 * gesti dello stack non funzionano su Android".
 *
 * Vive in un file dedicato perché richiede che i moduli non siano già stati
 * valutati da altri test: Vitest isola il registry per file, non per test.
 */
const loadOrder = vi.hoisted(() => [] as string[]);
const registerRootComponent = vi.hoisted(() => vi.fn());

vi.mock('react-native-gesture-handler', () => {
    loadOrder.push('gesture-handler');
    return {};
});

vi.mock('expo', () => ({registerRootComponent}));

vi.mock('../App', () => {
    loadOrder.push('App');
    return {default: () => null};
});

describe('entry point', () => {
    it('esegue il bootstrap prima di caricare App e registra la radice', async () => {
        await import('../index');

        expect(loadOrder).toEqual(['gesture-handler', 'App']);
        expect(registerRootComponent).toHaveBeenCalledTimes(1);
        expect(registerRootComponent).toHaveBeenCalledWith(expect.any(Function));
    });
});
