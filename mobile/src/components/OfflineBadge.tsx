import {type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle} from 'react-native';

import {t} from '@/i18n';
import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';

type OfflineBadgeProps = {
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
};

export function OfflineBadge({style, textStyle}: OfflineBadgeProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <View style={[styles.badge, style]}>
        <Text style={[styles.badgeText, textStyle]}>{t.api.offlineBadge}</Text>
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        badge: {
            height: 28,
            paddingHorizontal: 10,
            borderRadius: 14,
            backgroundColor: colors.warningBackground,
            borderWidth: 1,
            borderColor: colors.warning,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        },
        badgeText: {
            color: colors.warning,
            fontSize: 12,
            fontWeight: '700',
            lineHeight: 16
        }
    });
