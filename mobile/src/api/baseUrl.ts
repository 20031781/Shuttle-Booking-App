function readConfiguredValue(value: string | undefined): string | undefined {
    const normalized = value?.trim();
    if (!normalized) {
        return undefined;
    }

    return normalized;
}

/**
 * Risolve l'URL API mantenendo compatibilità con il nome env usato nelle prime
 * versioni del progetto.
 */
export function resolveApiBaseUrl(
    apiUrl: string | undefined,
    legacyApiUrl: string | undefined,
    fallbackUrl: string
): string {
    return (readConfiguredValue(apiUrl) ?? readConfiguredValue(legacyApiUrl) ?? fallbackUrl).replace(/\/+$/, '');
}
