import type {CompleteUserProfileInput} from '@/api/profileRepository';

export type ProfileCompletionField = keyof CompleteUserProfileInput;

const requiredProfileFields: ProfileCompletionField[] = ['firstName', 'lastName', 'club', 'city'];
const cityRegex = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,}$/u;

export function normalizeProfileCompletionInput(input: CompleteUserProfileInput): CompleteUserProfileInput {
    return {
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        club: input.club.trim(),
        city: input.city.trim()
    };
}

export function getMissingProfileCompletionFields(input: CompleteUserProfileInput): ProfileCompletionField[] {
    const normalized = normalizeProfileCompletionInput(input);
    return requiredProfileFields.filter(field => normalized[field].length === 0);
}

export function isProfileCompletionInputValid(input: CompleteUserProfileInput): boolean {
    return getMissingProfileCompletionFields(input).length === 0;
}

export function isCityFormatValid(city: string): boolean {
    return cityRegex.test(city.trim());
}
