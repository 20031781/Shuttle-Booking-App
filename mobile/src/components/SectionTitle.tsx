import {StyleSheet, Text, View} from 'react-native';

import {useSessionSnapshot} from '@/hooks/useSessionSnapshot';
import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';
import {OfflineBadge} from './OfflineBadge';

type SectionTitleProps = {
    title: string;
    subtitle: string;
    badge?: string;
};

export function SectionTitle({title, subtitle, badge}: SectionTitleProps) {
    const {colors, mode} = useAppTheme();
    const styles = createStyles(colors);
    // La modalità offline esiste già nella sessione: qui diventa finalmente visibile,
    // e su ogni schermata, perché SectionTitle è l'intestazione comune.
    const {isOfflineMode} = useSessionSnapshot();

    return <View style={[styles.container, mode === 'aurora' && styles.containerAurora]}>
        <View style={styles.headerRow}>
            {badge ? <Text style={[styles.badge, mode === 'aurora' && styles.badgeAurora]}>{badge}</Text> : null}
            {isOfflineMode ? <OfflineBadge/> : null}
        </View>
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
        containerAurora: {
            backgroundColor: 'rgba(8, 24, 42, 0.84)',
            borderColor: 'rgba(0, 201, 122, 0.25)'
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minHeight: 16
        },
        badge: {
            color: colors.primary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.5,
            textTransform: 'uppercase'
        },
        badgeAurora: {
            letterSpacing: 1,
            color: '#00d18a'
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
