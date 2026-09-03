import {describe, expect, it} from 'vitest';

import {resolveApiBaseUrl} from './baseUrl';

describe('resolveApiBaseUrl', () => {
    it('preferisce la variabile API attuale e rimuove gli slash finali', () => {
        expect(resolveApiBaseUrl(' https://api.example.com/// ', 'http://legacy.example.com', 'http://fallback'))
            .toBe('https://api.example.com');
    });

    it('usa l alias legacy quando la variabile attuale manca', () => {
        expect(resolveApiBaseUrl(undefined, ' http://legacy.example.com/// ', 'http://fallback'))
            .toBe('http://legacy.example.com');
    });

    it('usa il fallback quando entrambe le variabili sono vuote', () => {
        expect(resolveApiBaseUrl('  ', undefined, 'http://fallback///')).toBe('http://fallback');
    });
});
