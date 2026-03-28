import {StyleSheet, Text, View} from 'react-native';

import type {AppThemeColors} from '../theme/colors';
import {useAppTheme} from '../theme/theme';

type SectionTitleProps = {
    title: string;
    subtitle: string;
    badge?: string;
};

export function SectionTitle({title, subtitle, badge}: SectionTitleProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <View style={styles.container}>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        container: {
            backgroundColor: colors.backgroundAccent,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingVertical: 14,
            gap: 2
        },
        badge: {
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase'
        },
        title: {
            fontSize: 25,
            fontWeight: '700',
            color: colors.text
        },
        subtitle: {
            color: colors.subtleText,
            fontSize: 14
        }
    });
