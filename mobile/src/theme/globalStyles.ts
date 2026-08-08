import {StyleSheet} from 'react-native';

import type {AppThemeColors} from './colors';

export function createGlobalStyles(colors: AppThemeColors) {
    return StyleSheet.create({
        card: {
            backgroundColor: colors.surfaceElevated,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            shadowColor: '#000000',
            shadowOpacity: 0.18,
            shadowRadius: 14,
            shadowOffset: {width: 0, height: 8},
            elevation: 3
        },
        primaryButton: {
            marginTop: 8,
            alignSelf: 'flex-start',
            backgroundColor: colors.primary,
            borderWidth: 1,
            borderColor: colors.primary,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 9,
            minHeight: 42,
            justifyContent: 'center'
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
            backgroundColor: colors.surface,
            paddingHorizontal: 14,
            paddingVertical: 8,
            minHeight: 42,
            justifyContent: 'center'
        },
        outlineButtonText: {
            color: colors.text,
            fontWeight: '600'
        }
    });
}
