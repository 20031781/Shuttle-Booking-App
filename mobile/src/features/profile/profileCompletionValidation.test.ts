import {describe, expect, it} from 'vitest';

import {
    getMissingProfileCompletionFields,
    isCityFormatValid,
    isProfileCompletionInputValid,
    normalizeProfileCompletionInput
} from './profileCompletionValidation';

describe('profileCompletionValidation', () => {
    it('normalizes all required values trimming spaces', () => {
        const result = normalizeProfileCompletionInput({
            firstName: '  Lorenzo ',
            lastName: ' Appetito  ',
            club: '  Shuttle Club ',
            city: ' Roma '
        });

        expect(result).toEqual({
            firstName: 'Lorenzo',
            lastName: 'Appetito',
            club: 'Shuttle Club',
            city: 'Roma'
        });
    });

    it('returns all required fields when values are empty', () => {
        const result = getMissingProfileCompletionFields({
            firstName: ' ',
            lastName: '',
            club: '   ',
            city: ''
        });

        expect(result).toEqual(['firstName', 'lastName', 'club', 'city']);
    });

    it('is valid only when all mandatory fields are provided', () => {
        expect(
            isProfileCompletionInputValid({
                firstName: 'Lorenzo',
                lastName: 'Appetito',
                club: 'Shuttle Club',
                city: 'Roma'
            })
        ).toBe(true);

        expect(
            isProfileCompletionInputValid({
                firstName: 'Lorenzo',
                lastName: 'Appetito',
                club: '',
                city: 'Roma'
            })
        ).toBe(false);
    });

    it('validates city with letters, spaces and apostrophes only', () => {
        expect(isCityFormatValid('Reggio Emilia')).toBe(true);
        expect(isCityFormatValid("Sant'Antioco")).toBe(true);
        expect(isCityFormatValid('Roma 2')).toBe(false);
        expect(isCityFormatValid('')).toBe(false);
    });
});
