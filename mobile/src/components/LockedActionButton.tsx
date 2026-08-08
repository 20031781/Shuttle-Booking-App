import {type StyleProp, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';
import {InfoIconButton} from './InfoIconButton';

type LockedActionButtonProps = {
    label: string;
    /** Chiamato al tap sull'icona info: deve spiegare *perché* l'azione è bloccata. */
    onExplain: () => void;
    explainAccessibilityLabel: string;
    style?: StyleProp<ViewStyle>;
};

/**
 * Azione non disponibile che resta interrogabile: invece di un pulsante grigio
 * e muto, mostra il lucchetto e un'icona info che apre la spiegazione.
 */
export function LockedActionButton({label, onExplain, explainAccessibilityLabel, style}: LockedActionButtonProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <View style={[styles.button, style]}>
        <View style={styles.leadingIcon}>
            <Ionicons name="lock-closed" size={16} color={colors.subtleText}/>
        </View>
        <Text style={styles.label} numberOfLines={2}>{label}</Text>
        <InfoIconButton
            onPress={onExplain}
            accessibilityLabel={explainAccessibilityLabel}
            style={styles.trailingIcon}
        />
    </View>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        button: {
            width: '100%',
            minHeight: 42,
            justifyContent: 'center',
            paddingVertical: 9,
            paddingHorizontal: 44,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceSecondary,
            position: 'relative'
        },
        label: {
            width: '100%',
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 18,
            color: colors.subtleText,
            textAlign: 'center'
        },
        leadingIcon: {
            position: 'absolute',
            left: 14,
            top: 0,
            bottom: 0,
            justifyContent: 'center'
        },
        trailingIcon: {
            position: 'absolute',
            right: 10,
            top: 7
        }
    });
