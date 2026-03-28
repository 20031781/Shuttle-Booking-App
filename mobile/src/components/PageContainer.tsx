import type {PropsWithChildren} from 'react';
import {StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import type {AppThemeColors} from '../theme/colors';
import {useAppTheme} from '../theme/theme';

export function PageContainer({children}: PropsWithChildren) {
    const {colors} = useAppTheme();
    const styles = createStyles(colors);

    return <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>{children}</View>
    </SafeAreaView>;
}

const createStyles = (colors: AppThemeColors) =>
    StyleSheet.create({
        safeArea: {
            flex: 1,
            backgroundColor: colors.background
        },
        content: {
            flex: 1,
            paddingHorizontal: 18,
            paddingTop: 12,
            gap: 16
        }
    });
