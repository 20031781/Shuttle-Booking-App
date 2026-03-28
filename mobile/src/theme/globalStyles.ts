import {StyleSheet} from 'react-native';

import type {AppThemeColors} from './colors';

export function createGlobalStyles(colors: AppThemeColors) {
    return StyleSheet.create({
        card: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16
        },
        primaryButton: {
            marginTop: 8,
            alignSelf: 'flex-start',
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 9
        },
        primaryButtonText: {
            color: colors.onPrimary,
            fontWeight: '600'
        },
        outlineButton: {
            marginTop: 8,
            alignSelf: 'flex-start',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            paddingHorizontal: 14,
            paddingVertical: 8
        },
        outlineButtonText: {
            color: colors.text,
            fontWeight: '600'
        }
    });
}
