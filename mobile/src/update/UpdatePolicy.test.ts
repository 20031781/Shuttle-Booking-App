import {describe, expect, it} from 'vitest';

import {UpdatePolicy} from './UpdatePolicy';

describe('UpdatePolicy.evaluate', () => {
    const config = {latestVersionCode: 10, minSupportedVersionCode: 5};

    it('returns required when the current version is below the minimum supported one', () => {
        expect(UpdatePolicy.evaluate(4, config)).toBe('required');
    });

    it('returns optional when the current version is below latest but still supported', () => {
        expect(UpdatePolicy.evaluate(7, config)).toBe('optional');
    });

    it('returns upToDate when the current version matches or exceeds latest', () => {
        expect(UpdatePolicy.evaluate(10, config)).toBe('upToDate');
        expect(UpdatePolicy.evaluate(11, config)).toBe('upToDate');
    });

    it('prioritizes required over optional at the minimum boundary', () => {
        expect(UpdatePolicy.evaluate(5, config)).toBe('optional');
        expect(UpdatePolicy.evaluate(5, {...config, minSupportedVersionCode: 5, latestVersionCode: 5})).toBe(
            'upToDate'
        );
    });
});
