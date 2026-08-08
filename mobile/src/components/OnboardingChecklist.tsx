import {StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';

export type OnboardingChecklistItem = {
    key: string;
    label: string;
    done: boolean;
};

type OnboardingChecklistProps = {
    title: string;
    /** Reso come "2 / 4": mostra a colpo d'occhio quanto manca. */
    progressLabel: (completed: number, total: number) => string;
    items: OnboardingChecklistItem[];
};

export function OnboardingChecklist({title, progressLabel, items}: OnboardingChecklistProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);
    const completed = items.filter(item => item.done).length;
    const progressRatio = items.length === 0 ? 0 : completed / items.length;

    return <View style={styles.container}>
        <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.progress}>{progressLabel(completed, items.length)}</Text>
        </View>

        <View style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: `${Math.round(progressRatio * 100)}%`}]}/>
        </View>

        <View style={styles.items}>
            {items.map(item => <View key={item.key} style={styles.item}>
                <Ionicons
                    name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={item.done ? colors.success : colors.mutedText}
                />
                <Text style={[styles.itemLabel, item.done && styles.itemLabelDone]}>{item.label}</Text>
            </View>)}
        </View>
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        container: {
            gap: 10
        },
        headerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
        },
        title: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15,
            flex: 1
        },
        progress: {
            color: colors.subtleText,
            fontSize: 13,
            fontWeight: '600'
        },
        progressTrack: {
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.surfaceSecondary,
            overflow: 'hidden'
        },
        progressFill: {
            height: '100%',
            borderRadius: 3,
            backgroundColor: colors.primary
        },
        items: {
            gap: 6
        },
        item: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
        },
        itemLabel: {
            color: colors.subtleText,
            fontSize: 14,
            flex: 1
        },
        itemLabelDone: {
            color: colors.text,
            fontWeight: '600'
        }
    });
