import {describe, expect, it} from 'vitest';

import type {UpdateCheckResult} from './UpdateChecker';
import {buildUpdatePreviewResult, resolveDisplayedUpdateResult} from './UpdateDisplayResolver';

const actualResult: UpdateCheckResult = {
    requirement: 'optional',
    config: {latestVersionCode: 9, minSupportedVersionCode: 1, updateUrl: 'https://example.test/app'},
    currentVersionCode: 8
};

describe('buildUpdatePreviewResult', () => {
    it('non produce nulla in modalità none', () => {
        expect(buildUpdatePreviewResult('none', 5, 'https://example.test/app')).toBeNull();
    });

    it('non produce nulla senza un target di aggiornamento', () => {
        expect(buildUpdatePreviewResult('required', 5, null)).toBeNull();
        expect(buildUpdatePreviewResult('required', 5, undefined)).toBeNull();
    });

    it('in modalità optional la versione installata resta supportata', () => {
        const result = buildUpdatePreviewResult('optional', 5, 'https://example.test/app');

        expect(result?.requirement).toBe('optional');
        expect(result?.config.minSupportedVersionCode).toBe(5);
        expect(result?.config.latestVersionCode).toBe(6);
    });

    it('in modalità required la versione installata risulta fuori supporto', () => {
        const result = buildUpdatePreviewResult('required', 5, 'https://example.test/app');

        expect(result?.requirement).toBe('required');
        expect(result?.config.minSupportedVersionCode).toBeGreaterThan(result!.currentVersionCode);
    });
});

describe('resolveDisplayedUpdateResult', () => {
    it('la preview ha la precedenza sul risultato reale', () => {
        const preview = buildUpdatePreviewResult('required', 5, 'https://example.test/app');

        expect(resolveDisplayedUpdateResult(actualResult, preview, 'required', false)).toBe(preview);
    });

    it('la preview vince anche in dev build', () => {
        const preview = buildUpdatePreviewResult('optional', 5, 'https://example.test/app');

        expect(resolveDisplayedUpdateResult(null, preview, 'optional', true)).toBe(preview);
    });

    it('sopprime il risultato reale in dev build', () => {
        expect(resolveDisplayedUpdateResult(actualResult, null, 'none', true)).toBeNull();
    });

    it('mostra il risultato reale in build di produzione', () => {
        expect(resolveDisplayedUpdateResult(actualResult, null, 'none', false)).toBe(actualResult);
    });
});
