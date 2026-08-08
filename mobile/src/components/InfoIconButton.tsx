import {Pressable, type StyleProp, StyleSheet, type ViewStyle} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

import type {AppThemeColors} from '@/theme/colors';
import {useAppTheme} from '@/theme/theme';

type InfoIconButtonProps = {
    onPress: () => void;
    accessibilityLabel: string;
    style?: StyleProp<ViewStyle>;
};

export function InfoIconButton({onPress, accessibilityLabel, style}: InfoIconButtonProps) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        hitSlop={10}
        style={[styles.button, style]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.subtleText}/>
    </Pressable>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        button: {
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.surfaceSecondary
        }
    });
