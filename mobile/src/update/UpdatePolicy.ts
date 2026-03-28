export type UpdateRequirement = 'upToDate' | 'optional' | 'required';

export interface UpdateConfig {
    latestVersionCode: number;
    minSupportedVersionCode: number;
    updateUrl?: string;
}

export class UpdatePolicy {
    static evaluate(currentVersionCode: number, config: UpdateConfig): UpdateRequirement {
        if (currentVersionCode < config.minSupportedVersionCode) {
            return 'required';
        }

        if (currentVersionCode < config.latestVersionCode) {
            return 'optional';
        }

        return 'upToDate';
    }
}
